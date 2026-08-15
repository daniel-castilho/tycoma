import type { AuditEventWriter } from "@/modules/audit/domain/types";
import { argon2PasswordHasher } from "../infrastructure/argon2-password-hasher";
import { consoleMailer } from "../infrastructure/console-mailer";
import { jwtSessionIssuer } from "../infrastructure/jwt-session-issuer";
import { prismaPasswordResetTokenRepository } from "../infrastructure/prisma-password-reset-token-repository";
import { prismaUserRepository } from "../infrastructure/prisma-user-repository";
import { redisRateLimiter } from "../infrastructure/redis-rate-limiter";
import { createChangePassword } from "./use-cases/change-password";
import { createCountUsers } from "./use-cases/count-users";
import { createCreateFirstAdmin } from "./use-cases/create-first-admin";
import { createGetProfile } from "./use-cases/get-profile";
import { createLogin } from "./use-cases/login";
import { createRequestPasswordReset } from "./use-cases/request-password-reset";
import { createResetPassword } from "./use-cases/reset-password";
import { createUpdateProfile } from "./use-cases/update-profile";

/**
 * Composition root for the `auth` module. Wires this module's own
 * infrastructure adapters into its use cases. Cross-module ports (the audit
 * writer) are injected — the wiring itself lives in the framework layer
 * (`src/app/_lib/modules.ts`).
 */
export function createAuthApplication(auditEventWriter: AuditEventWriter) {
  return {
    countUsers: createCountUsers(prismaUserRepository),
    createFirstAdmin: createCreateFirstAdmin(prismaUserRepository, auditEventWriter, argon2PasswordHasher),
    login: createLogin(prismaUserRepository, jwtSessionIssuer, redisRateLimiter, auditEventWriter, argon2PasswordHasher),
    requestPasswordReset: createRequestPasswordReset(
      prismaUserRepository,
      prismaPasswordResetTokenRepository,
      consoleMailer,
      redisRateLimiter,
      auditEventWriter,
    ),
    resetPassword: createResetPassword(
      prismaUserRepository,
      prismaPasswordResetTokenRepository,
      auditEventWriter,
      argon2PasswordHasher,
    ),
    getProfile: createGetProfile(prismaUserRepository),
    updateProfile: createUpdateProfile(prismaUserRepository),
    changePassword: createChangePassword(prismaUserRepository, auditEventWriter, argon2PasswordHasher),
  };
}

export type AuthApplication = ReturnType<typeof createAuthApplication>;

export type { SessionPayload } from "../domain/session";