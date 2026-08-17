/**
 * Generates and hashes password-reset tokens. Abstractions over `node:crypto`
 * so the application layer stays pure; adapters pick the CSPRNG and hash
 * algorithm. Tokens are stored hashed, never in plaintext.
 */
export type TokenHasher = {
  generateRaw(): Promise<string>;
  hash(raw: string): Promise<string>;
};