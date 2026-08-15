export type PasswordResetToken = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
};

export type PasswordResetTokenRepository = {
  create(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<PasswordResetToken>;
  findValidByHash(tokenHash: string, now: Date): Promise<PasswordResetToken | null>;
  markUsed(id: string, usedAt: Date): Promise<void>;
};
