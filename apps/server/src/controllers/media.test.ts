import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import path from "node:path";
import { createApp } from "../app.js";
import { User, type UserDocument } from "../models/user.model.js";
import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import { Media } from "../models/media.model.js";
import { signAccessToken } from "../utils/token.utils.js";

describe("Media Upload & Attachment Sharing", () => {
  let mongod: MongoMemoryServer;
  const app = createApp();

  let userA: UserDocument;
  let userB: UserDocument;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { autoIndex: true });
    await Promise.all([User.init(), Conversation.init(), Message.init(), Media.init()]);
  }, 30000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Conversation.deleteMany({}),
      Message.deleteMany({}),
      Media.deleteMany({}),
    ]);

    userA = await User.create({
      email: "alice@connectly.local",
      username: "alice",
      displayName: "Alice Smith",
      passwordHash: "dummy",
    });

    userB = await User.create({
      email: "bob@connectly.local",
      username: "bob",
      displayName: "Bob Jones",
      passwordHash: "dummy",
    });

    tokenA = signAccessToken({ sub: userA._id.toString(), email: userA.email, username: userA.username });
    tokenB = signAccessToken({ sub: userB._id.toString(), email: userB.email, username: userB.username });
  });

  describe("POST /api/media/upload", () => {
    it("should reject unauthenticated upload requests with 401", async () => {
      const res = await request(app)
        .post("/api/media/upload")
        .attach("file", Buffer.from("image content"), "photo.png");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should reject upload when no file is attached with 400", async () => {
      const res = await request(app)
        .post("/api/media/upload")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FILE_REQUIRED");
    });

    it("should reject unsupported file types (e.g. .exe) with 400", async () => {
      const res = await request(app)
        .post("/api/media/upload")
        .set("Authorization", `Bearer ${tokenA}`)
        .attach("file", Buffer.from("fake binary"), {
          filename: "malware.exe",
          contentType: "application/x-msdownload",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INVALID_FILE_TYPE");
    });

    it("should reject image files larger than 5MB with 413", async () => {
      const hugeImage = Buffer.alloc(6 * 1024 * 1024);
      hugeImage[0] = 0x89;
      hugeImage[1] = 0x50;
      hugeImage[2] = 0x4e;
      hugeImage[3] = 0x47;
      hugeImage[4] = 0x0d;
      hugeImage[5] = 0x0a;
      hugeImage[6] = 0x1a;
      hugeImage[7] = 0x0a;

      const res = await request(app)
        .post("/api/media/upload")
        .set("Authorization", `Bearer ${tokenA}`)
        .attach("file", hugeImage, {
          filename: "huge.png",
          contentType: "image/png",
        });

      expect(res.status).toBe(413);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FILE_TOO_LARGE");
    });

    it("should successfully upload an image and return AttachmentDto with type image and store metadata in MongoDB", async () => {
      const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Buffer.from("valid-png")]);
      const res = await request(app)
        .post("/api/media/upload")
        .set("Authorization", `Bearer ${tokenA}`)
        .attach("file", validPng, {
          filename: "screenshot.png",
          contentType: "image/png",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        type: "image",
        name: "screenshot.png",
        mimeType: "image/png",
        size: validPng.length,
      });
      expect(res.body.data.url).toMatch(/^\/api\/media\//);

      // Verify MongoDB record
      const filename = path.basename(res.body.data.url);
      const media = await Media.findOne({ filename });
      expect(media).toBeDefined();
      expect(media?.originalName).toBe("screenshot.png");
      expect(media?.mimeType).toBe("image/png");
      expect(media?.size).toBe(validPng.length);
      expect(media?.uploaderId.toString()).toBe(userA._id.toString());
      expect(media?.storageKey).toContain("connectly/images");
    });

    it("should successfully upload a PDF document and return AttachmentDto with type file and store metadata in MongoDB", async () => {
      const validPdf = Buffer.from("%PDF-1.4 fake pdf data");
      const res = await request(app)
        .post("/api/media/upload")
        .set("Authorization", `Bearer ${tokenA}`)
        .attach("file", validPdf, {
          filename: "document.pdf",
          contentType: "application/pdf",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        type: "file",
        name: "document.pdf",
        mimeType: "application/pdf",
        size: validPdf.length,
      });

      // Verify MongoDB record
      const filename = path.basename(res.body.data.url);
      const media = await Media.findOne({ filename });
      expect(media).toBeDefined();
      expect(media?.originalName).toBe("document.pdf");
      expect(media?.mimeType).toBe("application/pdf");
      expect(media?.storageKey).toContain("connectly/documents");
    });
  });

  describe("GET /api/media/:filename", () => {
    it("should reject unauthenticated media retrieval with 401", async () => {
      const res = await request(app).get("/api/media/some-file.png");
      expect(res.status).toBe(401);
    });

    it("should return 404 if media file does not exist", async () => {
      const res = await request(app)
        .get("/api/media/non-existent-file.png")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("FILE_NOT_FOUND");
    });

    it("should successfully stream an existing uploaded file", async () => {
      const textBuffer = Buffer.from("test-media-stream-content");
      const uploadRes = await request(app)
        .post("/api/media/upload")
        .set("Authorization", `Bearer ${tokenA}`)
        .attach("file", textBuffer, {
          filename: "notes.txt",
          contentType: "text/plain",
        });

      expect(uploadRes.status).toBe(201);
      const filename = path.basename(uploadRes.body.data.url);

      const res = await request(app)
        .get(`/api/media/${filename}`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.text).toBe("test-media-stream-content");
    });
  });

  describe("Message with Attachment Integration", () => {
    it("should create and retrieve a message with an attachment", async () => {
      // 1. Create a conversation
      const convRes = await request(app)
        .post("/api/conversations")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ recipientId: userB._id.toString() });
      expect(convRes.status).toBe(201);
      const convId = convRes.body.data.id;

      // 2. Send message with text and attachment
      const sendRes = await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          content: "Here is the report",
          attachment: {
            url: "/api/media/sample-report.pdf",
            type: "file",
            name: "sample-report.pdf",
            size: 4096,
            mimeType: "application/pdf",
          },
        });

      expect(sendRes.status).toBe(201);
      expect(sendRes.body.data.attachment).toMatchObject({
        name: "sample-report.pdf",
        type: "file",
        mimeType: "application/pdf",
      });

      // 3. Fetch conversation messages
      const getRes = await request(app)
        .get(`/api/conversations/${convId}/messages`)
        .set("Authorization", `Bearer ${tokenB}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.messages).toHaveLength(1);
      expect(getRes.body.data.messages[0].attachment).toMatchObject({
        name: "sample-report.pdf",
        type: "file",
      });
    });

    it("should allow creating a message with an attachment and empty text content", async () => {
      const convRes = await request(app)
        .post("/api/conversations")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ recipientId: userB._id.toString() });
      const convId = convRes.body.data.id;

      const sendRes = await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          content: "",
          attachment: {
            url: "/api/media/photo.jpg",
            type: "image",
            name: "photo.jpg",
            size: 10240,
            mimeType: "image/jpeg",
          },
        });

      expect(sendRes.status).toBe(201);
      expect(sendRes.body.data.content).toBe("");
      expect(sendRes.body.data.attachment?.type).toBe("image");
    });

    it("should reject sending a message with neither content nor attachment", async () => {
      const convRes = await request(app)
        .post("/api/conversations")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ recipientId: userB._id.toString() });
      const convId = convRes.body.data.id;

      const sendRes = await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          content: "   ",
        });

      expect(sendRes.status).toBe(400);
      expect(sendRes.body.error.code).toBe("VALIDATION_ERROR");
    });
  });
});
