import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { User } from "../models/user.model.js";
import { RefreshSession } from "../models/refresh-session.model.js";
import { REFRESH_COOKIE_NAME } from "./auth.controller.js";

describe("Authentication & Authorization API", () => {
  let mongod: MongoMemoryServer;
  const app = createApp();

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri, { autoIndex: true });
    await Promise.all([User.init(), RefreshSession.init()]);
  }, 30000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
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

  describe("POST /api/auth/register", () => {
    it("should successfully register a new user and set HTTP-only refresh cookie", async () => {
      const res = await request(app).post("/api/auth/register").send({
        email: "sarah@connectly.dev",
        username: "sarah_c",
        displayName: "Sarah Connor",
        password: "SecurePassword123!",
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toMatchObject({
        email: "sarah@connectly.dev",
        username: "sarah_c",
        displayName: "Sarah Connor",
      });
      expect(res.body.data.accessToken).toBeDefined();

      // Check cookie
      const cookies = res.headers["set-cookie"] as string[] | undefined;
      expect(cookies).toBeDefined();
      const refreshCookie = cookies?.find((c) => c.startsWith(`${REFRESH_COOKIE_NAME}=`));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain("HttpOnly");
      expect(refreshCookie).toContain("Path=/");
    });

    it("should return 409 when email or username is already registered", async () => {
      await request(app).post("/api/auth/register").send({
        email: "existing@connectly.dev",
        username: "existing_user",
        displayName: "Existing User",
        password: "Password123!",
      });

      // Duplicate email
      const resEmail = await request(app).post("/api/auth/register").send({
        email: "existing@connectly.dev",
        username: "new_username",
        displayName: "New User",
        password: "Password123!",
      });
      expect(resEmail.status).toBe(409);
      expect(resEmail.body.error.code).toBe("EMAIL_EXISTS");

      // Duplicate username
      const resUsername = await request(app).post("/api/auth/register").send({
        email: "another@connectly.dev",
        username: "existing_user",
        displayName: "Another User",
        password: "Password123!",
      });
      expect(resUsername.status).toBe(409);
      expect(resUsername.body.error.code).toBe("USERNAME_EXISTS");
    });

    it("should reject registration with invalid fields (400 validation error)", async () => {
      const res = await request(app).post("/api/auth/register").send({
        email: "not-an-email",
        username: "ab", // too short
        displayName: "",
        password: "short", // < 8 chars
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.details).toHaveLength(4);
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      await request(app).post("/api/auth/register").send({
        email: "john@connectly.dev",
        username: "john_doe",
        displayName: "John Doe",
        password: "CorrectPassword123!",
      });
    });

    it("should log in successfully with email", async () => {
      const res = await request(app).post("/api/auth/login").send({
        identifier: "john@connectly.dev",
        password: "CorrectPassword123!",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.username).toBe("john_doe");
      expect(res.body.data.accessToken).toBeDefined();
    });

    it("should log in successfully with username", async () => {
      const res = await request(app).post("/api/auth/login").send({
        identifier: "john_doe",
        password: "CorrectPassword123!",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe("john@connectly.dev");
    });

    it("should reject invalid password with 401", async () => {
      const res = await request(app).post("/api/auth/login").send({
        identifier: "john_doe",
        password: "WrongPassword!",
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    });
  });

  describe("GET /api/auth/me (Protected Route)", () => {
    it("should allow access with valid access token", async () => {
      const registerRes = await request(app).post("/api/auth/register").send({
        email: "me@connectly.dev",
        username: "me_user",
        displayName: "Me User",
        password: "Password123!",
      });

      const token = registerRes.body.data.accessToken;

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.username).toBe("me_user");
    });

    it("should reject access without token (401)", async () => {
      const res = await request(app).get("/api/auth/me");

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("should reject access with invalid token (401)", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid_garbage_token");

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_TOKEN");
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("should rotate token on refresh and issue new credentials", async () => {
      const loginRes = await request(app).post("/api/auth/register").send({
        email: "refresh@connectly.dev",
        username: "refresh_user",
        displayName: "Refresh User",
        password: "Password123!",
      });

      const cookies = loginRes.headers["set-cookie"] as string[];
      const refreshCookie = cookies.find((c) => c.startsWith(`${REFRESH_COOKIE_NAME}=`));

      const res = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", [refreshCookie!]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();

      // Old refresh token should now be revoked and reject future refresh
      const replayRes = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", [refreshCookie!]);

      expect(replayRes.status).toBe(401);
      expect(replayRes.body.error.code).toBe("SESSION_REVOKED");
    });

    it("should reject refresh when no cookie provided (401)", async () => {
      const res = await request(app).post("/api/auth/refresh");
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("REFRESH_TOKEN_REQUIRED");
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should revoke session and clear cookie", async () => {
      const registerRes = await request(app).post("/api/auth/register").send({
        email: "logout@connectly.dev",
        username: "logout_user",
        displayName: "Logout User",
        password: "Password123!",
      });

      const cookies = registerRes.headers["set-cookie"] as string[];
      const refreshCookie = cookies.find((c) => c.startsWith(`${REFRESH_COOKIE_NAME}=`));

      const logoutRes = await request(app)
        .post("/api/auth/logout")
        .set("Cookie", [refreshCookie!]);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      // Verify cookie is cleared
      const setCookies = logoutRes.headers["set-cookie"] as string[];
      expect(setCookies.some((c) => c.includes(`${REFRESH_COOKIE_NAME}=;`))).toBe(true);

      // Verify session was revoked in database
      const count = await RefreshSession.countDocuments({ isRevoked: true });
      expect(count).toBeGreaterThan(0);
    });
  });
});

