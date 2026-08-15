import type { SessionVerifier } from "../../domain/session";

/**
 * Edge-safe use case: takes a `SessionVerifier` injected by the caller so the
 * `auth/application` module never drags Prisma or ioredis into the Edge bundle.
 *
 * The Next.js middleware (`src/proxy.ts`) consumes this through
 * `@/modules/auth/application/edge`, which wires a jose-only verifier.
 */
export function createVerifySessionToken(verifier: SessionVerifier) {
  return async function verifySessionToken(token: string | undefined) {
    if (!token) return null;
    return verifier.verify(token);
  };
}
