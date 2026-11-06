import http from "node:http";
import { PassThrough } from "node:stream";
import type { Socket } from "node:net";
import type { Express } from "express";
import { createApp } from "./app.js";
import { connectDatabase } from "./db/connection.js";
import { logger } from "./config/logger.js";

export interface ServerlessEvent {
  path?: string;
  rawUrl?: string;
  httpMethod: string;
  headers?: Record<string, string | undefined>;
  multiValueHeaders?: Record<string, string[] | undefined>;
  queryStringParameters?: Record<string, string | undefined>;
  multiValueQueryStringParameters?: Record<string, string[] | undefined>;
  body?: string | null;
  isBase64Encoded?: boolean;
}

export interface ServerlessResponse {
  statusCode: number;
  headers?: Record<string, string>;
  multiValueHeaders?: Record<string, string[]>;
  body: string;
  isBase64Encoded?: boolean;
}

export function normalizePath(rawPath: string | undefined): string {
  if (!rawPath) return "/health";

  // Strip Netlify Functions prefix if invoked through function path
  let cleanPath = rawPath.replace(/^\/\.netlify\/functions\/[^/]+/, "");

  if (!cleanPath || cleanPath === "") {
    cleanPath = "/";
  }

  // Normalize API sub-routes if rewritten without /api prefix
  const apiPrefixes = ["/auth", "/presence", "/conversations", "/users", "/media"];
  for (const prefix of apiPrefixes) {
    if (cleanPath === prefix || cleanPath.startsWith(prefix + "/")) {
      cleanPath = `/api${cleanPath}`;
      break;
    }
  }

  return cleanPath;
}

function buildRequestUrl(path: string, queryStringParameters?: Record<string, string | undefined>): string {
  if (!queryStringParameters || Object.keys(queryStringParameters).length === 0) {
    return path;
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(queryStringParameters)) {
    if (value !== undefined) {
      params.append(key, value);
    }
  }
  const queryStr = params.toString();
  return queryStr ? `${path}?${queryStr}` : path;
}

let cachedApp: Express | null = null;

export function getOrCreateApp(): Express {
  if (!cachedApp) {
    cachedApp = createApp();
  }
  return cachedApp;
}

export async function createServerlessHandler(
  event: ServerlessEvent,
  context?: unknown
): Promise<ServerlessResponse> {
  const origin = event.headers?.origin || event.headers?.Origin || "*";

  // Handle CORS OPTIONS preflight requests immediately
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "access-control-allow-origin": origin,
        "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "access-control-allow-headers": "Content-Type, Authorization, Cookie, X-Requested-With",
        "access-control-allow-credentials": "true",
        "access-control-max-age": "86400",
      },
      body: "",
    };
  }

  const cleanPath = normalizePath(event.path);
  const requestUrl = buildRequestUrl(cleanPath, event.queryStringParameters);

  // Lazy database connection: bypass DB connection for pure health endpoints
  if (cleanPath !== "/" && cleanPath !== "/health" && cleanPath !== "/api/health") {
    try {
      await connectDatabase();
    } catch (err) {
      logger.warn({ err }, "MongoDB connection failed or deferred in serverless invocation");
    }
  }

  const app = getOrCreateApp();

  return new Promise<ServerlessResponse>((resolve) => {
    try {
      const socket = new PassThrough();
      const req = new http.IncomingMessage(socket as unknown as Socket);
      req.httpVersion = "1.1";
      req.httpVersionMajor = 1;
      req.httpVersionMinor = 1;
      req.method = event.httpMethod || "GET";
      req.url = requestUrl;

      // Normalize headers
      const headers: Record<string, string> = {};
      if (event.headers) {
        for (const [k, v] of Object.entries(event.headers)) {
          if (v !== undefined) {
            headers[k.toLowerCase()] = v;
          }
        }
      }

      let bodyBuffer: Buffer | null = null;
      if (event.body) {
        bodyBuffer = event.isBase64Encoded
          ? Buffer.from(event.body, "base64")
          : Buffer.from(event.body, "utf8");
        if (!headers["content-length"]) {
          headers["content-length"] = String(bodyBuffer.length);
        }
      }
      req.headers = headers;

      const res = new http.ServerResponse(req);
      const chunks: Buffer[] = [];

      res.write = function (
        chunk: unknown,
        encoding?: BufferEncoding | ((error: Error | null | undefined) => void),
        cb?: (error: Error | null | undefined) => void
      ): boolean {
        if (chunk) {
          const enc = typeof encoding === "string" ? encoding : undefined;
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string, enc));
        }
        if (typeof encoding === "function") encoding(null);
        if (cb) cb(null);
        return true;
      };

      res.end = function (
        chunk?: unknown,
        encoding?: BufferEncoding | (() => void),
        cb?: () => void
      ): http.ServerResponse {
        if (chunk) {
          const enc = typeof encoding === "string" ? encoding : undefined;
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string, enc));
        }
        if (typeof encoding === "function") encoding();
        if (cb) cb();
        this.emit("finish");
        return this;
      };

      res.on("finish", () => {
        const rawHeaders = res.getHeaders();
        const responseHeaders: Record<string, string> = {
          "access-control-allow-origin": origin,
          "access-control-allow-credentials": "true",
        };
        const multiValueHeaders: Record<string, string[]> = {};

        for (const [key, value] of Object.entries(rawHeaders)) {
          if (value === undefined) continue;
          if (Array.isArray(value)) {
            multiValueHeaders[key] = value.map(String);
            if (value.length > 0) {
              responseHeaders[key] = String(value[0]);
            }
          } else {
            responseHeaders[key] = String(value);
          }
        }

        const contentType = String(rawHeaders["content-type"] || "");
        const isBinary =
          !contentType.startsWith("text/") &&
          !contentType.includes("application/json") &&
          !contentType.includes("application/javascript") &&
          !contentType.includes("application/xml");

        const fullBuffer = Buffer.concat(chunks);
        let body: string;
        let isBase64Encoded = false;

        if (isBinary && fullBuffer.length > 0) {
          body = fullBuffer.toString("base64");
          isBase64Encoded = true;
        } else {
          body = fullBuffer.toString("utf8");
        }

        resolve({
          statusCode: res.statusCode || 200,
          headers: responseHeaders,
          multiValueHeaders: Object.keys(multiValueHeaders).length > 0 ? multiValueHeaders : undefined,
          body,
          isBase64Encoded,
        });
      });

      if (bodyBuffer && bodyBuffer.length > 0) {
        req.push(bodyBuffer);
      }
      req.push(null);

      app(req, res);
    } catch (err: unknown) {
      logger.error({ err }, "Unhandled error during serverless request processing");
      resolve({
        statusCode: 500,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          success: false,
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: err instanceof Error ? err.message : "Internal server error",
          },
        }),
      });
    }
  });
}

// Default Netlify Function handler export
export const handler = createServerlessHandler;
