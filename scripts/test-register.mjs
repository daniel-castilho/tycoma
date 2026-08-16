// Registers the path-alias resolver so `npm test` understands `@/*`.
// Loaded via `node --import ./scripts/test-register.mjs`.
//
// Also seeds `process.env` with the minimum values needed by
// `@/shared/env-instance` so tests that transitively import adapters
// (prisma, redis, session-cookie, etc.) don't crash on `process.env` reads.
// Real CI sets values in `.github/workflows/ci.yml`; locally users that
// need real values should still create `.env`.
import { register } from "node:module";

if (!process.env.NODE_ENV) process.env.NODE_ENV = "test";
if (!process.env.AUTH_SECRET) process.env.AUTH_SECRET = "ci-test-only-secret-0123456789abcdef";
if (!process.env.DATABASE_URL) process.env.DATABASE_URL = "mongodb://localhost:27017/tycoma?replicaSet=rs0&directConnection=true";
if (!process.env.REDIS_URL) process.env.REDIS_URL = "redis://localhost:6379";

register("./test-resolver.mjs", import.meta.url);
