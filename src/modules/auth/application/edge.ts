/**
 * Edge-safe entrypoint for the `auth` module.
 *
 * Only use cases and adapters that have no Node-only dependencies (no Prisma,
 * no ioredis) are exported from here. Anything that touches the database or
 * Redis MUST go through `@/modules/auth/application` (Node runtime only).
 *
 * Today this is consumed by `src/proxy.ts` (Next.js middleware).
 */
import { jwtSessionVerifier } from "../infrastructure/jwt-session-verifier";
import { createVerifySessionToken } from "./use-cases/verify-session-token";

export const verifySessionToken = createVerifySessionToken(jwtSessionVerifier);
