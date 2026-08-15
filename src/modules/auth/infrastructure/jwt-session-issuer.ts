import { SignJWT, jwtVerify } from "jose";
import type { SessionIssuer, SessionPayload } from "../domain/session";

function secret() {
  const raw = process.env.AUTH_SECRET;
  if (!raw) {
    throw new Error("AUTH_SECRET is not set");
  }
  return new TextEncoder().encode(raw);
}

export const jwtSessionIssuer: SessionIssuer = {
  async issue(payload) {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret());
  },
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
