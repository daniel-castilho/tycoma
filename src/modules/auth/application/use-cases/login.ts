import bcrypt from "bcryptjs";
import { err, ok, type Result } from "@/shared/kernel/result";
import type { RateLimiter } from "../../domain/rate-limiter";
import type { SessionIssuer } from "../../domain/session";
import type { UserRepository } from "../../domain/user";

export function createLogin(
  users: UserRepository,
  sessions: SessionIssuer,
  limiter: RateLimiter,
) {
  return async function login(input: {
    email: string;
    password: string;
    ip: string;
  }): Promise<Result<{ token: string }>> {
    const email = input.email.trim().toLowerCase();
    const limit = await limiter.hit(`login:${input.ip}:${email}`, 8, 15 * 60);
    if (!limit.allowed) {
      return err("Too many login attempts. Try again later.");
    }
    const user = await users.findByEmail(email);
    if (!user) {
      return err("Invalid email or password.");
    }
    const match = await bcrypt.compare(input.password, user.passwordHash);
    if (!match) {
      return err("Invalid email or password.");
    }
    const token = await sessions.issue({
      sub: user.id,
      email: user.email,
      name: user.name,
    });
    return ok({ token });
  };
}
