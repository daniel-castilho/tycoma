import { createHash, randomBytes } from "node:crypto";
import { PASSWORD_RESET_TOKEN_BYTES } from "../domain/policies";
import type { TokenHasher } from "../domain/token-hasher";

/**
 * Node-only token hasher for password-reset flows. Uses a CSPRNG for the raw
 * token and SHA-256 for the stored hash. Safe for production: the raw token
 * is never persisted, only its digest.
 */
export const sha256TokenHasher: TokenHasher = {
  async generateRaw() {
    return randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString("hex");
  },
  async hash(raw) {
    return createHash("sha256").update(raw).digest("hex");
  },
};