import { jwtVerify } from "jose";
import type { SessionVerifier } from "../domain/session";

function secret() {
  const raw = process.env.AUTH_SECRET;
  if (!raw) {
    throw new Error("AUTH_SECRET is not set");
  }
  return new TextEncoder().encode(raw);
}

/**
 * Edge-safe verifier: only depends on `jose` and `process.env.AUTH_SECRET`.
 * Safe to import from `auth/application/edge.ts` (no Prisma, no ioredis).
 */
export const jwtSessionVerifier: SessionVerifier = {
  async verify(token) {
    try {
      const { payload } = await jwtVerify(token, secret());
      if (
        typeof payload.sub !== "string" ||
        typeof payload.email !== "string" ||
        typeof payload.name !== "string"
      ) {
        return null;
      }
      return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
      };
    } catch {
      return null;
    }
  },
};
