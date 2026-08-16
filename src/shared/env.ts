import { z } from "zod";

/**
 * Known placeholder values that must never be used in production. These come
 * from old tutorials and the project's own `.env.example` — they are
 * convenient in dev but would silently turn HMAC keys into public knowledge.
 */
const FORBIDDEN_AUTH_SECRETS = [
  "change-me-to-a-long-random-string",
  "changeme",
  "secret",
  "dev-secret",
];

/**
 * Single validated source of environment configuration. Node-only runtime
 * adapters import this instead of reading `process.env` directly. The edge
 * verifier (`auth/infrastructure/jwt-session-verifier.ts`) deliberately keeps
 * reading `AUTH_SECRET` directly so the Next.js proxy stays edge-safe.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET must be set."),
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

export type EnvInput = Record<string, string | undefined>;

/**
 * Validates a candidate environment object and returns the parsed config.
 * Exported so tests can exercise the production-only rules without mutating
 * `process.env`. Production requires `AUTH_SECRET` ≥ 32 chars and rejects
 * known placeholders; development/test requires ≥ 16.
 */
export function parseEnv(source: EnvInput): z.infer<typeof envSchema> {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    throw new Error(
      `Invalid environment configuration: ${JSON.stringify(flat.fieldErrors)}`,
    );
  }

  const data = parsed.data;

  // Next.js sets NODE_ENV=production for `next build`. The production-only
  // AUTH_SECRET rules must not break a local build that still has a placeholder
  // secret in `.env`. We treat the build phase as "not yet production" — the
  // strong rule applies at runtime in production, where the placeholder
  // would have been replaced.
  const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build";
  const effectiveNodeEnv = isProductionBuild ? "development" : data.NODE_ENV;

  if (effectiveNodeEnv === "production") {
    const errors: string[] = [];
    if (data.AUTH_SECRET.length < 32) {
      errors.push("AUTH_SECRET must be at least 32 characters in production.");
    }
    if (FORBIDDEN_AUTH_SECRETS.includes(data.AUTH_SECRET)) {
      errors.push(`AUTH_SECRET cannot be the placeholder "${data.AUTH_SECRET}".`);
    }
    if (data.AUTH_SECRET.trim() !== data.AUTH_SECRET) {
      errors.push("AUTH_SECRET must not contain leading or trailing whitespace.");
    }
    if (errors.length > 0) {
      throw new Error(`Invalid environment configuration: ${errors.join(" ")}`);
    }
  } else if (data.AUTH_SECRET.length < 16) {
    throw new Error(
      `Invalid environment configuration: AUTH_SECRET must be at least 16 characters in ${data.NODE_ENV}.`,
    );
  }
  return data;
}