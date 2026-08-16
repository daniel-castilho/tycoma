import { SignJWT } from "jose";
import { env } from "@/shared/env-instance";
import { jwtSessionVerifier } from "./jwt-session-verifier";
import type { SessionIssuer } from "../domain/session";

function secret() {
  return new TextEncoder().encode(env.AUTH_SECRET);
}

export const jwtSessionIssuer: SessionIssuer = {
  async issue(payload) {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("12h")
      .sign(secret());
  },
  verify: jwtSessionVerifier.verify,
};
