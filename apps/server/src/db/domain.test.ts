import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";
import { User } from "../models/user.model.js";
import { Conversation, createParticipantKey } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import { RefreshSession } from "../models/refresh-session.model.js";
import { seedDevelopmentDatabase } from "./seed.js";

describe("Domain Models & Constraints", () => {
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri, { autoIndex: true });
    // Wait for indexes to build
    await Promise.all([
      User.init(),
      Conversation.init(),
      Message.init(),
      RefreshSession.init(),
    ]);
  }, 30000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      if (collection) {
        await collection.deleteMany({});
      }
    }
  });

  describe("User Model", () => {
    it("should create a valid user", async () => {
      const user = await User.create({
        email: "test@connectly.dev",
        username: "testuser",
        displayName: "Test User",
        passwordHash: "hash123",
      });

      expect(user._id).toBeDefined();
      expect(user.email).toBe("test@connectly.dev");
      expect(user.username).toBe("testuser");
      expect(user.lastSeenAt).toBeDefined();
    });

    it("should enforce unique email constraint", async () => {
      await User.create({
        email: "unique@connectly.dev",
        username: "user1",
        displayName: "User One",
        passwordHash: "hash123",
      });

      await expect(
        User.create({
          email: "unique@connectly.dev",
          username: "user2",
          displayName: "User Two",
          passwordHash: "hash123",
        })
      ).rejects.toThrow();
    });

    it("should enforce unique username constraint", async () => {
      await User.create({
        email: "user1@connectly.dev",
        username: "sameuser",
        displayName: "User One",
        passwordHash: "hash123",
      });

      await expect(
        User.create({
          email: "user2@connectly.dev",
          username: "sameuser",
          displayName: "User Two",
          passwordHash: "hash123",
        })
      ).rejects.toThrow();
    });

    it("should not return passwordHash in queries by default", async () => {
      await User.create({
        email: "secure@connectly.dev",
        username: "secureuser",
        displayName: "Secure User",
        passwordHash: "secret_hash",
      });

      const user = await User.findOne({ username: "secureuser" });
      expect(user).toBeDefined();
      expect(user?.passwordHash).toBeUndefined();

      // Explicit select allows retrieving it
      const userWithSecret = await User.findOne({ username: "secureuser" }).select("+passwordHash");
      expect(userWithSecret?.passwordHash).toBe("secret_hash");
    });
  });

  describe("Conversation Model & 1-to-1 Constraints", () => {
    it("should create deterministic participantKey regardless of ID ordering", () => {
      const id1 = new Types.ObjectId("65bb11111111111111111111");
      const id2 = new Types.ObjectId("65bb22222222222222222222");

      const keyA = createParticipantKey(id1, id2);
      const keyB = createParticipantKey(id2, id1);

      expect(keyA).toBe(keyB);
      expect(keyA).toBe(`${id1.toString()}:${id2.toString()}`);
    });

    it("should prevent duplicate 1-to-1 conversations between same users", async () => {
      const userA = new Types.ObjectId();
      const userB = new Types.ObjectId();
      const participantKey = createParticipantKey(userA, userB);

      await Conversation.create({
        participants: [userA, userB],
        participantKey,
      });

      // Attempt duplicate creation
      await expect(
        Conversation.create({
          participants: [userB, userA],
          participantKey,
        })
      ).rejects.toThrow();
    });

    it("should reject conversations with invalid participant count", async () => {
      const userA = new Types.ObjectId();
      const userB = new Types.ObjectId();
      const userC = new Types.ObjectId();

      // Only 1 participant
      await expect(
        Conversation.create({
          participants: [userA],
          participantKey: userA.toString(),
        })
      ).rejects.toThrow("must have exactly 2 participants");

      // 3 participants
      await expect(
        Conversation.create({
          participants: [userA, userB, userC],
          participantKey: `${userA}:${userB}:${userC}`,
        })
      ).rejects.toThrow("must have exactly 2 participants");

      // Self-conversation
      await expect(
        Conversation.create({
          participants: [userA, userA],
          participantKey: `${userA}:${userA}`,
        })
      ).rejects.toThrow("cannot create a conversation with themselves");
    });

    it("should store conversation read cursors", async () => {
      const userA = new Types.ObjectId();
      const userB = new Types.ObjectId();
      const msgId = new Types.ObjectId();

      const conv = await Conversation.create({
        participants: [userA, userB],
        participantKey: createParticipantKey(userA, userB),
        readCursors: [
          {
            userId: userA,
            lastReadMessageId: msgId,
            readAt: new Date(),
          },
        ],
      });

      expect(conv.readCursors).toHaveLength(1);
      expect(conv.readCursors[0]?.userId.toString()).toBe(userA.toString());
      expect(conv.readCursors[0]?.lastReadMessageId.toString()).toBe(msgId.toString());
    });
  });

  describe("Message Model & Idempotency", () => {
    it("should enforce message idempotency on clientTempId", async () => {
      const convId = new Types.ObjectId();
      const senderId = new Types.ObjectId();
      const clientTempId = "temp-uuid-12345";

      await Message.create({
        conversationId: convId,
        senderId,
        clientTempId,
        content: "First attempt delivery",
      });

      // Duplicate delivery retry with same temp ID in same conversation from same sender
      await expect(
        Message.create({
          conversationId: convId,
          senderId,
          clientTempId,
          content: "Duplicate attempt delivery",
        })
      ).rejects.toThrow();
    });

    it("should allow different clientTempIds for same sender and conversation", async () => {
      const convId = new Types.ObjectId();
      const senderId = new Types.ObjectId();

      const m1 = await Message.create({
        conversationId: convId,
        senderId,
        clientTempId: "msg-1",
        content: "Hello",
      });

      const m2 = await Message.create({
        conversationId: convId,
        senderId,
        clientTempId: "msg-2",
        content: "World",
      });

      expect(m1._id).toBeDefined();
      expect(m2._id).toBeDefined();
      expect(m1._id.toString()).not.toBe(m2._id.toString());
    });

    it("should paginate messages by createdAt descending", async () => {
      const convId = new Types.ObjectId();
      const senderId = new Types.ObjectId();

      const now = Date.now();
      await Message.create({
        conversationId: convId,
        senderId,
        content: "Older message",
        createdAt: new Date(now - 10000),
      });

      await Message.create({
        conversationId: convId,
        senderId,
        content: "Newer message",
        createdAt: new Date(now),
      });

      const messages = await Message.find({ conversationId: convId }).sort({ createdAt: -1 });

      expect(messages).toHaveLength(2);
      expect(messages[0]?.content).toBe("Newer message");
      expect(messages[1]?.content).toBe("Older message");
    });
  });

  describe("RefreshSession Model", () => {
    it("should enforce unique tokenHash", async () => {
      const userId = new Types.ObjectId();

      await RefreshSession.create({
        userId,
        tokenHash: "hashed_refresh_token_1",
        expiresAt: new Date(Date.now() + 100000),
      });

      await expect(
        RefreshSession.create({
          userId,
          tokenHash: "hashed_refresh_token_1",
          expiresAt: new Date(Date.now() + 100000),
        })
      ).rejects.toThrow();
    });

    it("should verify active session state at application level", async () => {
      const userId = new Types.ObjectId();
      const future = new Date(Date.now() + 3600000);
      const past = new Date(Date.now() - 3600000);

      const validSession = await RefreshSession.create({
        userId,
        tokenHash: "valid_hash",
        expiresAt: future,
        isRevoked: false,
      });

      const expiredSession = await RefreshSession.create({
        userId,
        tokenHash: "expired_hash",
        expiresAt: past,
        isRevoked: false,
      });

      const revokedSession = await RefreshSession.create({
        userId,
        tokenHash: "revoked_hash",
        expiresAt: future,
        isRevoked: true,
      });

      const now = new Date();

      // Application level validation logic
      expect(validSession.expiresAt > now && !validSession.isRevoked).toBe(true);
      expect(expiredSession.expiresAt > now && !expiredSession.isRevoked).toBe(false);
      expect(revokedSession.expiresAt > now && !revokedSession.isRevoked).toBe(false);
    });
  });

  describe("Safe Development Seed", () => {
    it("should successfully seed demo data idempotently", async () => {
      const result1 = await seedDevelopmentDatabase();
      expect(result1.usersCount).toBe(3);
      expect(result1.conversationsCount).toBe(1);
      expect(result1.messagesCount).toBe(3);

      // Re-running seed does not duplicate users or conversations
      const result2 = await seedDevelopmentDatabase();
      expect(result2.usersCount).toBe(3);
      expect(result2.conversationsCount).toBe(1);

      const totalUsers = await User.countDocuments();
      const totalConversations = await Conversation.countDocuments();
      expect(totalUsers).toBe(3);
      expect(totalConversations).toBe(1);
    });
  });
});

