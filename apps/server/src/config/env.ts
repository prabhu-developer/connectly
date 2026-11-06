import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables from .env file if available
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:3000,https://connectlyi.netlify.app"),
  MONGODB_URI: z.string().default("mongodb://localhost:27017/connectly"),
  JWT_ACCESS_SECRET: z.string().min(16).default("dev_access_secret_change_in_production_min_32_chars"),
  JWT_REFRESH_SECRET: z.string().min(16).default("dev_refresh_secret_change_in_production_min_32_chars"),
  COOKIE_SECRET: z.string().min(16).default("dev_cookie_secret_change_in_production_min_32_chars"),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errorDetails = result.error.errors
      .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
      .join("\n");
    console.error(`❌ Invalid environment variables:\n${errorDetails}`);
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();

