export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
};

/**
 * Narrower port than `SessionIssuer`: only verifies, never issues.
 * Exists so that Edge runtime callers (Next.js `proxy.ts`/middleware) can be wired
 * to a verifier that has no Node-only dependencies (Prisma, ioredis), while the
 * full `SessionIssuer` stays available in Node contexts (RSC, server actions).
 */
export type SessionVerifier = {
  verify(token: string): Promise<SessionPayload | null>;
};

export type SessionIssuer = SessionVerifier & {
  issue(payload: SessionPayload): Promise<string>;
};
