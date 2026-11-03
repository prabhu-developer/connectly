import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";

describe("Server Foundation & Health Checks", () => {
  const app = createApp();

  it("should respond with 200 OK on GET /health", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: "ok",
      version: "0.1.0",
      environment: "test",
    });
    expect(res.body.timestamp).toBeDefined();
    expect(typeof res.body.uptime).toBe("number");
  });

  it("should respond with 200 OK on GET /api/health", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: "ok",
      version: "0.1.0",
    });
  });

  it("should return standardized 404 for non-existent routes", async () => {
    const res = await request(app).get("/api/non-existent-route");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Cannot GET /api/non-existent-route",
      },
    });
  });
});

