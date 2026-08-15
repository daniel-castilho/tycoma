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
import { createVerifySession } from "./use-cases/verify-session";

export const countUsers = createCountUsers(prismaUserRepository);
export const createFirstAdmin = createCreateFirstAdmin(prismaUserRepository);
export const login = createLogin(prismaUserRepository, jwtSessionIssuer, redisRateLimiter);
export const requestPasswordReset = createRequestPasswordReset(
  prismaUserRepository,
  prismaPasswordResetTokenRepository,
  consoleMailer,
  redisRateLimiter,
);
export const resetPassword = createResetPassword(
  prismaUserRepository,
  prismaPasswordResetTokenRepository,
);
export const getProfile = createGetProfile(prismaUserRepository);
export const updateProfile = createUpdateProfile(prismaUserRepository);
export const changePassword = createChangePassword(prismaUserRepository);
export const verifySession = createVerifySession(jwtSessionIssuer);

export type { SessionPayload } from "../domain/session";
