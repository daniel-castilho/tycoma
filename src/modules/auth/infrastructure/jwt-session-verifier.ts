import { jwtVerify } from "jose";
import { validateAuthSecret } from "@/shared/kernel/secret";
import type { SessionVerifier } from "../domain/session";

function secret() {
  const validated = validateAuthSecret(process.env.AUTH_SECRET, {
    isProduction: process.env.NODE_ENV === "production",
  });
  return new TextEncoder().encode(validated);
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
