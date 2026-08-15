import argon2 from "@node-rs/argon2";
import type { Options } from "@node-rs/argon2";
import type { PasswordHasher } from "../domain/password-hasher";

// @node-rs/argon2 ships Algorithm/Version as ambient const enums with no
// runtime values (erased at compile time), so pass the documented member
// values directly: Argon2id = 2, version 0x13 = 1. Parameters follow the
// OWASP-recommended Argon2id baseline (64 MiB, 3 passes, 1 lane).
const options: Options = {
  algorithm: 2,
  version: 1,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
  outputLen: 32,
};

export const argon2PasswordHasher: PasswordHasher = {
  async hash(password: string): Promise<string> {
    return argon2.hash(password, options);
  },
  async verify(password: string, encoded: string): Promise<boolean> {
    try {
      return await argon2.verify(encoded, password);
    } catch {
      return false;
    }
  },
};