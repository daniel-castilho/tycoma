export type PasswordResetMail = {
  appUrl: string;
  token: string;
};

export type Mailer = {
  sendPasswordReset(to: string, mail: PasswordResetMail): Promise<void>;
};
