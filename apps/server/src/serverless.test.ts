import { describe, it, expect } from "vitest";
import { handler, normalizePath } from "./serverless.js";

describe("Netlify Serverless Adapter & Handler", () => {
  describe("Path Normalization", () => {
    it("should default undefined or empty path to /health", () => {
      expect(normalizePath(undefined)).toBe("/health");
      expect(normalizePath("")).toBe("/health");
    });

    it("should strip /.netlify/functions/api prefix", () => {
      expect(normalizePath("/.netlify/functions/api/health")).toBe("/health");
      expect(normalizePath("/.netlify/functions/api/api/health")).toBe("/api/health");
      expect(normalizePath("/.netlify/functions/api/api/auth/login")).toBe("/api/auth/login");
    });

    it("should preserve direct root and /health paths", () => {
      expect(normalizePath("/")).toBe("/");
      expect(normalizePath("/health")).toBe("/health");
    });

    it("should automatically prepend /api to domain routes when stripped", () => {
      expect(normalizePath("/.netlify/functions/api/auth/login")).toBe("/api/auth/login");
      expect(normalizePath("/.netlify/functions/api/conversations")).toBe("/api/conversations");
      expect(normalizePath("/.netlify/functions/api/users/profile")).toBe("/api/users/profile");
      expect(normalizePath("/.netlify/functions/api/presence")).toBe("/api/presence");
      expect(normalizePath("/.netlify/functions/api/media/upload")).toBe("/api/media/upload");
    });
  });

  describe("Serverless Execution Handling", () => {
    it("should respond with 200 OK and expected JSON on GET /health", async () => {
      const response = await handler({
        httpMethod: "GET",
        path: "/health",
        headers: { host: "connectlyi-api.netlify.app" },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        success: true,
        message: "Connectly API is running",
      });
      expect(response.headers?.["access-control-allow-origin"]).toBeDefined();
    });

    it("should respond with 200 OK when requested via Netlify function path", async () => {
      const response = await handler({
        httpMethod: "GET",
        path: "/.netlify/functions/api/health",
        headers: { host: "connectlyi-api.netlify.app" },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        success: true,
        message: "Connectly API is running",
      });
    });

    it("should handle CORS preflight OPTIONS request without executing app", async () => {
      const response = await handler({
        httpMethod: "OPTIONS",
        path: "/api/auth/login",
        headers: {
          origin: "https://connectly-web.netlify.app",
        },
      });

      expect(response.statusCode).toBe(204);
      expect(response.headers?.["access-control-allow-origin"]).toBe("https://connectly-web.netlify.app");
      expect(response.headers?.["access-control-allow-methods"]).toContain("POST");
      expect(response.body).toBe("");
    });

    it("should parse request body and return 400 validation error for incomplete register payload", async () => {
      const response = await handler({
        httpMethod: "POST",
        path: "/api/auth/register",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ email: "invalid-email" }),
      });

      expect(response.statusCode).toBe(400);
      const parsed = JSON.parse(response.body);
      expect(parsed.success).toBe(false);
      expect(parsed.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return standardized 404 for unknown serverless route", async () => {
      const response = await handler({
        httpMethod: "GET",
        path: "/api/does-not-exist",
      });

      expect(response.statusCode).toBe(404);
      const parsed = JSON.parse(response.body);
      expect(parsed.success).toBe(false);
      expect(parsed.error.code).toBe("NOT_FOUND");
    });
  });
});
