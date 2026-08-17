import { prisma } from "@/shared/db/prisma";
import type {
  PasswordResetToken,
  PasswordResetTokenRepository,
} from "../domain/password-reset-token";

type PasswordResetTokenRow = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
};

function mapPasswordResetToken(row: PasswordResetTokenRow): PasswordResetToken {
  return {
    id: row.id,
    userId: row.userId,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    usedAt: row.usedAt,
  };
}

export const prismaPasswordResetTokenRepository: PasswordResetTokenRepository = {
  async create(data) {
    return mapPasswordResetToken(await prisma.passwordResetToken.create({ data }));
  },
  async findValidByHash(tokenHash, now) {
    const row = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: { isSet: false },
        expiresAt: { gt: now },
      },
    });
    return row ? mapPasswordResetToken(row) : null;
  },
  async markUsed(id, usedAt) {
    await prisma.passwordResetToken.update({ where: { id }, data: { usedAt } });
  },
};
