export type Mailer = {
  sendPasswordReset(to: string, resetUrl: string): Promise<void>;
};
