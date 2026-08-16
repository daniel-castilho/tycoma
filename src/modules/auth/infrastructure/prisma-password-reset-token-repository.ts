import { prisma } from "@/shared/db/prisma";
import type {
  PasswordResetToken,
  PasswordResetTokenRepository,
} from "../domain/password-reset-token";

export const prismaPasswordResetTokenRepository: PasswordResetTokenRepository = {
  async create(data) {
    return prisma.passwordResetToken.create({ data }) as Promise<PasswordResetToken>;
  },
  async findValidByHash(tokenHash, now) {
    return prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: { isSet: false },
        expiresAt: { gt: now },
      },
    });
  },
  async markUsed(id, usedAt) {
    await prisma.passwordResetToken.update({ where: { id }, data: { usedAt } });
  },
};
