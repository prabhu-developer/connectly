import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { io as ClientSocket, type Socket as ClientSocketType } from "socket.io-client";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { createSocketServer, type AppSocketServer } from "./index.js";
import { presenceService } from "../services/presence.service.js";
import { User } from "../models/user.model.js";
import { signAccessToken } from "../utils/token.utils.js";
import {
  SOCKET_EVENTS,
  type PresenceChangePayload,
  type PresenceSyncPayload,
  type TypingPayload,
} from "@repo/contracts/socket";

describe("Socket.IO Real-Time Infrastructure & Presence", () => {
  let mongod: MongoMemoryServer;
  let httpServer: HttpServer;
  let io: AppSocketServer;
  let serverPort: number;
  const app = createApp();

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { autoIndex: true });
    await User.init();

    httpServer = createServer(app);
    io = createSocketServer(httpServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const addr = httpServer.address() as AddressInfo;
        serverPort = addr.port;
        resolve();
      });
    });
  }, 30000);

  afterAll(async () => {
    io.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    presenceService.reset();
    await User.deleteMany({});
  });

  function createClient(token?: string): ClientSocketType {
    return ClientSocket(`http://localhost:${serverPort}`, {
      auth: token ? { token } : undefined,
      transports: ["websocket"],
      reconnection: false,
    });
  }

  describe("Socket Authentication Handshake", () => {
    it("should reject connection when no auth token is provided", async () => {
      const client = createClient();

      const errorPromise = new Promise<string>((resolve) => {
        client.on("connect_error", (err) => {
          resolve(err.message);
        });
      });

      const message = await errorPromise;
      expect(message).toContain("Authentication error");
      client.close();
    });

    it("should reject connection when invalid token is provided", async () => {
      const client = createClient("invalid-malformed-token");

      const errorPromise = new Promise<string>((resolve) => {
        client.on("connect_error", (err) => {
          resolve(err.message);
        });
      });

      const message = await errorPromise;
      expect(message).toContain("Authentication error");
      client.close();
    });

    it("should successfully connect when valid access token is provided", async () => {
      const user = await User.create({
        email: "alice@connectly.local",
        username: "alice",
        displayName: "Alice Smith",
        passwordHash: "dummy",
      });

      const token = signAccessToken({
        sub: user._id.toString(),
        email: user.email,
        username: user.username,
      });

      const client = createClient(token);

      const connectPromise = new Promise<boolean>((resolve) => {
        client.on("connect", () => {
          resolve(true);
        });
      });

      const connected = await connectPromise;
      expect(connected).toBe(true);
      expect(client.connected).toBe(true);

      client.close();
    });
  });

  describe("Multi-Session Presence Tracking & Lifecycle", () => {
    it("should track multi-session connections and broadcast presence changes accurately", async () => {
      const userA = await User.create({
        email: "alice@connectly.local",
        username: "alice",
        displayName: "Alice Smith",
        passwordHash: "dummy",
      });

      const userB = await User.create({
        email: "bob@connectly.local",
        username: "bob",
        displayName: "Bob Jones",
        passwordHash: "dummy",
      });

      const tokenA = signAccessToken({
        sub: userA._id.toString(),
        email: userA.email,
        username: userA.username,
      });

      const tokenB = signAccessToken({
        sub: userB._id.toString(),
        email: userB.email,
        username: userB.username,
      });

      // 1. User B connects observer socket
      const clientB = createClient(tokenB);
      await new Promise<void>((resolve) => clientB.on("connect", resolve));

      const presenceChanges: PresenceChangePayload[] = [];
      clientB.on(SOCKET_EVENTS.PRESENCE_CHANGE, (payload: PresenceChangePayload) => {
        presenceChanges.push(payload);
      });

      // 2. User A opens tab 1 -> should trigger online presence broadcast
      const clientA1 = createClient(tokenA);
      await new Promise<void>((resolve) => clientA1.on("connect", resolve));

      // Wait for broadcast to reach User B
      await new Promise((r) => setTimeout(r, 100));
      expect(presenceChanges).toHaveLength(1);
      expect(presenceChanges[0]).toEqual({
        userId: userA._id.toString(),
        isOnline: true,
      });

      // Verify presence in service
      expect(presenceService.isUserOnline(userA._id.toString())).toBe(true);

      // 3. User A opens tab 2 -> should NOT broadcast duplicate online event
      const clientA2 = createClient(tokenA);
      await new Promise<void>((resolve) => clientA2.on("connect", resolve));
      await new Promise((r) => setTimeout(r, 100));
      expect(presenceChanges).toHaveLength(1); // Still 1

      // 4. User A closes tab 1 -> user is still online because tab 2 is open
      clientA1.close();
      await new Promise((r) => setTimeout(r, 100));
      expect(presenceChanges).toHaveLength(1); // Still 1, not offline
      expect(presenceService.isUserOnline(userA._id.toString())).toBe(true);

      // 5. User A closes tab 2 (last connection) -> should broadcast offline and persist lastSeenAt
      clientA2.close();
      await new Promise((r) => setTimeout(r, 150));
      expect(presenceChanges).toHaveLength(2);
      expect(presenceChanges[1]?.userId).toBe(userA._id.toString());
      expect(presenceChanges[1]?.isOnline).toBe(false);
      expect(presenceChanges[1]?.lastSeenAt).toBeDefined();

      expect(presenceService.isUserOnline(userA._id.toString())).toBe(false);

      // Verify lastSeenAt is persisted in the database
      const updatedUserA = await User.findById(userA._id);
      expect(updatedUserA?.lastSeenAt).toBeDefined();
      expect(updatedUserA?.lastSeenAt?.getTime()).toBeLessThanOrEqual(Date.now());

      clientB.close();
    });

    it("should provide initial online presence sync on connection", async () => {
      const userA = await User.create({
        email: "alice@connectly.local",
        username: "alice",
        displayName: "Alice",
        passwordHash: "dummy",
      });

      const userB = await User.create({
        email: "bob@connectly.local",
        username: "bob",
        displayName: "Bob",
        passwordHash: "dummy",
      });

      const tokenA = signAccessToken({
        sub: userA._id.toString(),
        email: userA.email,
        username: userA.username,
      });

      const tokenB = signAccessToken({
        sub: userB._id.toString(),
        email: userB.email,
        username: userB.username,
      });

      // User A connects first
      const clientA = createClient(tokenA);
      await new Promise<void>((resolve) => clientA.on("connect", resolve));

      // User B connects second, expects sync payload containing user A's ID
      const clientB = createClient(tokenB);
      const syncPromise = new Promise<PresenceSyncPayload>((resolve) => {
        clientB.on(SOCKET_EVENTS.PRESENCE_SYNC, (data: PresenceSyncPayload) => {
          resolve(data);
        });
      });

      const syncData = await syncPromise;
      expect(syncData.onlineUserIds).toContain(userA._id.toString());
      expect(syncData.onlineUserIds).toContain(userB._id.toString());

      clientA.close();
      clientB.close();
    });
  });

  describe("Real-Time Typing Indicators & Room Scoping", () => {
    it("should broadcast typing indicators only to users in the same conversation room", async () => {
      const userA = await User.create({
        email: "alice@connectly.local",
        username: "alice",
        displayName: "Alice",
        passwordHash: "dummy",
      });

      const userB = await User.create({
        email: "bob@connectly.local",
        username: "bob",
        displayName: "Bob",
        passwordHash: "dummy",
      });

      const userC = await User.create({
        email: "charlie@connectly.local",
        username: "charlie",
        displayName: "Charlie",
        passwordHash: "dummy",
      });

      const clientA = createClient(
        signAccessToken({ sub: userA._id.toString(), email: userA.email, username: userA.username })
      );
      const clientB = createClient(
        signAccessToken({ sub: userB._id.toString(), email: userB.email, username: userB.username })
      );
      const clientC = createClient(
        signAccessToken({ sub: userC._id.toString(), email: userC.email, username: userC.username })
      );

      await Promise.all([
        new Promise<void>((r) => clientA.on("connect", r)),
        new Promise<void>((r) => clientB.on("connect", r)),
        new Promise<void>((r) => clientC.on("connect", r)),
      ]);

      const conversationId = "conv-room-123";

      // User A and User B join the conversation room
      clientA.emit(SOCKET_EVENTS.CONVERSATION_JOIN, { conversationId });
      clientB.emit(SOCKET_EVENTS.CONVERSATION_JOIN, { conversationId });
      // User C does NOT join
      await new Promise((r) => setTimeout(r, 50));

      const bTypingEvents: TypingPayload[] = [];
      const cTypingEvents: TypingPayload[] = [];

      clientB.on(SOCKET_EVENTS.TYPING_START, (data: TypingPayload) => bTypingEvents.push(data));
      clientC.on(SOCKET_EVENTS.TYPING_START, (data: TypingPayload) => cTypingEvents.push(data));

      // User A starts typing
      clientA.emit(SOCKET_EVENTS.TYPING_START, { conversationId });
      await new Promise((r) => setTimeout(r, 100));

      expect(bTypingEvents).toHaveLength(1);
      expect(bTypingEvents[0]?.userId).toBe(userA._id.toString());
      expect(bTypingEvents[0]?.conversationId).toBe(conversationId);
      expect(cTypingEvents).toHaveLength(0); // User C received nothing

      // User A stops typing
      const bStopEvents: TypingPayload[] = [];
      clientB.on(SOCKET_EVENTS.TYPING_STOP, (data: TypingPayload) => bStopEvents.push(data));

      clientA.emit(SOCKET_EVENTS.TYPING_STOP, { conversationId });
      await new Promise((r) => setTimeout(r, 100));

      expect(bStopEvents).toHaveLength(1);
      expect(bStopEvents[0]?.userId).toBe(userA._id.toString());

      clientA.close();
      clientB.close();
      clientC.close();
    });
  });

  describe("REST Presence API", () => {
    it("should query single user presence and batch presence via REST", async () => {
      const userA = await User.create({
        email: "alice@connectly.local",
        username: "alice",
        displayName: "Alice",
        passwordHash: "dummy",
      });

      const userB = await User.create({
        email: "bob@connectly.local",
        username: "bob",
        displayName: "Bob",
        passwordHash: "dummy",
        lastSeenAt: new Date("2026-01-01T12:00:00Z"),
      });

      const tokenA = signAccessToken({
        sub: userA._id.toString(),
        email: userA.email,
        username: userA.username,
      });

      // Connect User A via socket to mark online
      const clientA = createClient(tokenA);
      await new Promise<void>((resolve) => clientA.on("connect", resolve));

      // 1. Test GET /api/presence/:userId for online user
      const resA = await request(app)
        .get(`/api/presence/${userA._id.toString()}`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(resA.status).toBe(200);
      expect(resA.body.data.isOnline).toBe(true);

      // 2. Test GET /api/presence/:userId for offline user
      const resB = await request(app)
        .get(`/api/presence/${userB._id.toString()}`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(resB.status).toBe(200);
      expect(resB.body.data.isOnline).toBe(false);
      expect(resB.body.data.lastSeenAt).toBeDefined();

      // 3. Test GET /api/presence batch
      const resBatch = await request(app)
        .get(`/api/presence?userIds=${userA._id.toString()},${userB._id.toString()}`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(resBatch.status).toBe(200);
      expect(resBatch.body.data.users[userA._id.toString()].isOnline).toBe(true);
      expect(resBatch.body.data.users[userB._id.toString()].isOnline).toBe(false);

      clientA.close();
    });
  });
});
