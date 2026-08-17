import argon2 from "@node-rs/argon2";
import type { Options } from "@node-rs/argon2";
import { ARGON2_OPTIONS } from "../domain/policies";
import type { PasswordHasher } from "../domain/password-hasher";

const options: Options = ARGON2_OPTIONS;

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