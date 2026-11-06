import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { User, type UserDocument } from "../models/user.model.js";
import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import { signAccessToken } from "../utils/token.utils.js";

describe("Conversation & Message REST APIs", () => {
  let mongod: MongoMemoryServer;
  const app = createApp();

  let userA: UserDocument;
  let userB: UserDocument;
  let userC: UserDocument;
  let tokenA: string;
  let tokenB: string;
  let tokenC: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { autoIndex: true });
    await Promise.all([User.init(), Conversation.init(), Message.init()]);
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

    userC = await User.create({
      email: "charlie@connectly.local",
      username: "charlie",
      displayName: "Charlie Davis",
      passwordHash: "dummy",
    });

    tokenA = signAccessToken({ sub: userA._id.toString(), email: userA.email, username: userA.username });
    tokenB = signAccessToken({ sub: userB._id.toString(), email: userB.email, username: userB.username });
    tokenC = signAccessToken({ sub: userC._id.toString(), email: userC.email, username: userC.username });
  });

  describe("POST /api/conversations (findOrCreateConversation)", () => {
    it("should create a new 1-to-1 conversation", async () => {
      const res = await request(app)
        .post("/api/conversations")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ recipientId: userB._id.toString() });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.participant.id).toBe(userB._id.toString());
      expect(res.body.data.participant.username).toBe("bob");
    });

    it("should return the exact same conversation when called again by either participant (deduplication)", async () => {
      const res1 = await request(app)
        .post("/api/conversations")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ recipientId: userB._id.toString() });

      const res2 = await request(app)
        .post("/api/conversations")
        .set("Authorization", `Bearer ${tokenB}`)
        .send({ recipientId: userA._id.toString() });

      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);
      expect(res1.body.data.id).toBe(res2.body.data.id);

      const totalConvs = await Conversation.countDocuments({});
      expect(totalConvs).toBe(1);
    });

    it("should reject conversation creation with self", async () => {
      const res = await request(app)
        .post("/api/conversations")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ recipientId: userA._id.toString() });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("SELF_CONVERSATION");
    });

    it("should return 404 when recipient does not exist", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post("/api/conversations")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ recipientId: nonExistentId });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("USER_NOT_FOUND");
    });
  });

  describe("GET /api/conversations", () => {
    it("should list conversations and isolate non-participants", async () => {
      // Create conversation between A and B
      await request(app)
        .post("/api/conversations")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ recipientId: userB._id.toString() });

      // User A can see it
      const resA = await request(app)
        .get("/api/conversations")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(resA.status).toBe(200);
      expect(resA.body.data).toHaveLength(1);
      expect(resA.body.data[0].participant.username).toBe("bob");

      // User C cannot see it
      const resC = await request(app)
        .get("/api/conversations")
        .set("Authorization", `Bearer ${tokenC}`);

      expect(resC.status).toBe(200);
      expect(resC.body.data).toHaveLength(0);
    });
  });

  describe("GET /api/conversations/:id", () => {
    it("should allow participants to view details and forbid outsiders", async () => {
      const createRes = await request(app)
        .post("/api/conversations")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ recipientId: userB._id.toString() });

      const convId = createRes.body.data.id;

      // Participant A can fetch
      const resA = await request(app)
        .get(`/api/conversations/${convId}`)
        .set("Authorization", `Bearer ${tokenA}`);
      expect(resA.status).toBe(200);
      expect(resA.body.data.id).toBe(convId);

      // Outsider C is forbidden
      const resC = await request(app)
        .get(`/api/conversations/${convId}`)
        .set("Authorization", `Bearer ${tokenC}`);
      expect(resC.status).toBe(403);
    });
  });

  describe("POST /api/conversations/:id/messages (Idempotency & Sending)", () => {
    it("should create a message and update lastMessage on the conversation", async () => {
      const createRes = await request(app)
        .post("/api/conversations")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ recipientId: userB._id.toString() });

      const convId = createRes.body.data.id;

      const msgRes = await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ content: "Hello Bob!" });

      expect(msgRes.status).toBe(201);
      expect(msgRes.body.data.content).toBe("Hello Bob!");
      expect(msgRes.body.data.status).toBe("sent");

      // Verify conversation has lastMessage updated
      const convRes = await request(app)
        .get(`/api/conversations/${convId}`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(convRes.body.data.lastMessage.content).toBe("Hello Bob!");
      expect(convRes.body.data.lastMessage.senderId).toBe(userA._id.toString());
    });

    it("should enforce idempotency when clientTempId is repeated", async () => {
      const createRes = await request(app)
        .post("/api/conversations")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ recipientId: userB._id.toString() });

      const convId = createRes.body.data.id;
      const clientTempId = "temp-msg-uuid-12345";

      // 1. Send first message
      const msgRes1 = await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ content: "Network retry test", clientTempId });

      // 2. Simulate client network retry with the identical clientTempId
      const msgRes2 = await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ content: "Network retry test", clientTempId });

      expect(msgRes1.status).toBe(201);
      expect(msgRes2.status).toBe(201);
      // Identical message ID returned without creating duplicates
      expect(msgRes1.body.data.id).toBe(msgRes2.body.data.id);

      const count = await Message.countDocuments({ clientTempId });
      expect(count).toBe(1);
    });

    it("should forbid non-participants from sending messages", async () => {
      const createRes = await request(app)
        .post("/api/conversations")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ recipientId: userB._id.toString() });

      const convId = createRes.body.data.id;

      const resC = await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .set("Authorization", `Bearer ${tokenC}`)
        .send({ content: "Unauthorized intrusion attempt" });

      expect(resC.status).toBe(403);
    });
  });

  describe("GET /api/conversations/:id/messages (Cursor Pagination)", () => {
    it("should return paginated messages in chronological order", async () => {
      const createRes = await request(app)
        .post("/api/conversations")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ recipientId: userB._id.toString() });

      const convId = createRes.body.data.id;

      // Seed 5 messages
      for (let i = 1; i <= 5; i++) {
        await request(app)
          .post(`/api/conversations/${convId}/messages`)
          .set("Authorization", `Bearer ${tokenA}`)
          .send({ content: `Message #${i}` });
      }

      // Fetch first page of 3 messages
      const page1 = await request(app)
        .get(`/api/conversations/${convId}/messages?limit=3`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(page1.status).toBe(200);
      expect(page1.body.data.messages).toHaveLength(3);
      expect(page1.body.data.hasMore).toBe(true);
      expect(page1.body.data.nextCursor).toBeDefined();

      // Oldest in this slice is Message #3
      expect(page1.body.data.messages[0].content).toBe("Message #3");
      expect(page1.body.data.messages[2].content).toBe("Message #5");

      // Fetch next page using cursor
      const cursor = page1.body.data.nextCursor;
      const page2 = await request(app)
        .get(`/api/conversations/${convId}/messages?limit=3&cursor=${cursor}`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(page2.status).toBe(200);
      expect(page2.body.data.messages).toHaveLength(2); // Remaining 2 messages (#1, #2)
      expect(page2.body.data.hasMore).toBe(false);
      expect(page2.body.data.messages[0].content).toBe("Message #1");
      expect(page2.body.data.messages[1].content).toBe("Message #2");
    });
  });

  describe("POST /api/conversations/:id/read (Read Cursor & Receipts)", () => {
    it("should advance participant read cursor and update message read status", async () => {
      const createRes = await request(app)
        .post("/api/conversations")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ recipientId: userB._id.toString() });

      const convId = createRes.body.data.id;

      // User A sends 2 messages
      await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ content: "First unread message" });

      const msg2Res = await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ content: "Second unread message" });

      const msg2Id = msg2Res.body.data.id;

      // Check User B's conversations -> should have 2 unread messages
      const bConvsBefore = await request(app)
        .get("/api/conversations")
        .set("Authorization", `Bearer ${tokenB}`);

      expect(bConvsBefore.body.data[0].unreadCount).toBe(2);

      // User B marks as read up to msg2Id
      const readRes = await request(app)
        .post(`/api/conversations/${convId}/read`)
        .set("Authorization", `Bearer ${tokenB}`)
        .send({ messageId: msg2Id });

      expect(readRes.status).toBe(200);
      expect(readRes.body.data.success).toBe(true);

      // Check User B's conversations again -> unreadCount should now be 0
      const bConvsAfter = await request(app)
        .get("/api/conversations")
        .set("Authorization", `Bearer ${tokenB}`);

      expect(bConvsAfter.body.data[0].unreadCount).toBe(0);

      // Messages should have status "read" in the database
      const messages = await Message.find({ conversationId: convId });
      expect(messages.every((m) => m.status === "read")).toBe(true);
    });
  });

  describe("GET /api/users/search (User Discovery)", () => {
    it("should search users by prefix and exclude the caller", async () => {
      const res = await request(app)
        .get("/api/users/search?q=bo")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].username).toBe("bob");
    });

    it("should never return the requesting user in search results", async () => {
      const res = await request(app)
        .get("/api/users/search?q=alice")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });
  });

  describe("GET /api/conversations/:id/messages/search (Message Search)", () => {
    it("should search messages inside a conversation matching text query", async () => {
      // 1. Create conversation between Alice and Bob
      const convRes = await request(app)
        .post("/api/conversations")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ recipientId: userB._id.toString() });
      const convId = convRes.body.data.id;

      // 2. Send messages
      await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ content: "Let us schedule a project sync tomorrow" });

      await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .set("Authorization", `Bearer ${tokenB}`)
        .send({ content: "Sure, let us discuss the architecture" });

      await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ content: "Project architecture is ready" });

      // 3. Search for "architecture"
      const searchRes = await request(app)
        .get(`/api/conversations/${convId}/messages/search?q=architecture`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(searchRes.status).toBe(200);
      expect(searchRes.body.success).toBe(true);
      expect(searchRes.body.data).toHaveLength(2);
      expect(searchRes.body.data[0].matchSnippet).toBeDefined();

      // 4. Search for query that doesn't match
      const emptyRes = await request(app)
        .get(`/api/conversations/${convId}/messages/search?q=nonexistent`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(emptyRes.status).toBe(200);
      expect(emptyRes.body.data).toHaveLength(0);

      // 5. Reject unauthorized non-participant
      const unauthRes = await request(app)
        .get(`/api/conversations/${convId}/messages/search?q=architecture`)
        .set("Authorization", `Bearer ${tokenC}`);

      expect(unauthRes.status).toBe(403);
    });
  });
});
