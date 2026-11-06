import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { User, type UserDocument } from "../models/user.model.js";
import { signAccessToken } from "../utils/token.utils.js";

describe("User Profile & Status APIs", () => {
  let mongod: MongoMemoryServer;
  const app = createApp();

  let userA: UserDocument;
  let userB: UserDocument;
  let tokenA: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { autoIndex: true });
    await User.init();
  }, 30000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});

    userA = await User.create({
      email: "alice@connectly.local",
      username: "alice",
      displayName: "Alice Smith",
      bio: "Hello world!",
      passwordHash: "dummy",
    });

    userB = await User.create({
      email: "bob@connectly.local",
      username: "bob",
      displayName: "Bob Jones",
      bio: "Available for chat",
      passwordHash: "dummy",
    });

    tokenA = signAccessToken({
      sub: userA._id.toString(),
      email: userA.email,
      username: userA.username,
    });
  });

  describe("GET /api/users/profile", () => {
    it("should reject unauthenticated requests with 401", async () => {
      const res = await request(app).get("/api/users/profile");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should return the authenticated user profile with 200", async () => {
      const res = await request(app)
        .get("/api/users/profile")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        id: userA._id.toString(),
        email: "alice@connectly.local",
        username: "alice",
        displayName: "Alice Smith",
        bio: "Hello world!",
      });
      expect(res.body.data.passwordHash).toBeUndefined();
    });
  });

  describe("PATCH /api/users/profile", () => {
    it("should reject unauthenticated requests with 401", async () => {
      const res = await request(app)
        .patch("/api/users/profile")
        .send({ displayName: "New Name" });

      expect(res.status).toBe(401);
    });

    it("should successfully update display name, bio, and avatarUrl", async () => {
      const res = await request(app)
        .patch("/api/users/profile")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          displayName: "Alice Wonderland",
          bio: "Exploring wonderlands",
          avatarUrl: "/api/media/avatar-alice.png",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        displayName: "Alice Wonderland",
        bio: "Exploring wonderlands",
        avatarUrl: "/api/media/avatar-alice.png",
      });

      // Verify persisted in DB
      const updatedUser = await User.findById(userA._id);
      expect(updatedUser?.displayName).toBe("Alice Wonderland");
      expect(updatedUser?.bio).toBe("Exploring wonderlands");
      expect(updatedUser?.avatarUrl).toBe("/api/media/avatar-alice.png");
    });

    it("should reject bio exceeding 160 characters with 400", async () => {
      const longBio = "a".repeat(161);
      const res = await request(app)
        .patch("/api/users/profile")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ bio: longBio });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject empty display name with 400", async () => {
      const res = await request(app)
        .patch("/api/users/profile")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ displayName: "   " });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /api/users/:id", () => {
    it("should return another user's public profile without sensitive data", async () => {
      const res = await request(app)
        .get(`/api/users/${userB._id.toString()}`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        id: userB._id.toString(),
        username: "bob",
        displayName: "Bob Jones",
        bio: "Available for chat",
      });
      // Sensitive fields must not be present
      expect(res.body.data.email).toBeUndefined();
      expect(res.body.data.passwordHash).toBeUndefined();
    });

    it("should return 400 for invalid user ObjectId", async () => {
      const res = await request(app)
        .get("/api/users/invalid-id-format")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_ID");
    });

    it("should return 404 if user is not found", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/users/${nonExistentId}`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("USER_NOT_FOUND");
    });
  });

  describe("User Settings APIs (GET & PATCH /api/users/settings)", () => {
    it("should retrieve default settings for authenticated user", async () => {
      const res = await request(app)
        .get("/api/users/settings")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({
        soundEnabled: true,
        enterToSend: true,
        desktopNotifications: false,
        theme: "system",
      });
    });

    it("should update user settings and persist to database", async () => {
      const res = await request(app)
        .patch("/api/users/settings")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          soundEnabled: false,
          enterToSend: false,
          desktopNotifications: true,
          theme: "dark",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({
        soundEnabled: false,
        enterToSend: false,
        desktopNotifications: true,
        theme: "dark",
      });

      // Verify persisted
      const user = await User.findById(userA._id);
      expect(user?.settings?.soundEnabled).toBe(false);
      expect(user?.settings?.theme).toBe("dark");
    });
  });
});
