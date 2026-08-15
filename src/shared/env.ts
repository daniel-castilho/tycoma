import { z } from "zod";

/**
 * Single validated source of environment configuration. Node-only runtime
 * adapters import this instead of reading `process.env` directly. The edge
 * verifier (`auth/infrastructure/jwt-session-verifier.ts`) deliberately keeps
 * reading `AUTH_SECRET` directly so the Next.js proxy stays edge-safe.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be set and at least 16 characters."),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required."),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  S3_ENDPOINT: z.string().min(1).default("http://localhost:4566"),
  S3_REGION: z.string().min(1).default("us-east-1"),
  S3_BUCKET: z.string().min(1).default("tycoma-media"),
  S3_ACCESS_KEY_ID: z.string().min(1).default("test"),
  S3_SECRET_ACCESS_KEY: z.string().min(1).default("test"),
  S3_FORCE_PATH_STYLE: z.string().default("true"),
  S3_PUBLIC_BASE_URL: z.string().min(1).default("http://localhost:4566/tycoma-media"),
});

export const env = envSchema.parse(process.env);