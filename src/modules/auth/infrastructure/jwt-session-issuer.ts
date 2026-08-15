import { SignJWT, jwtVerify } from "jose";
import { env } from "@/shared/env";
import type { SessionIssuer } from "../domain/session";

function secret() {
  return new TextEncoder().encode(env.AUTH_SECRET);
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
