import type { SessionIssuer, SessionPayload } from "../../domain/session";

export function createVerifySession(sessions: SessionIssuer) {
  return async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
    if (!token) return null;
    return sessions.verify(token);
  };
}
