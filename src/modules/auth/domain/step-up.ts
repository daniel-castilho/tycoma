/**
 * Domain port for step-up re-authentication markers. Implementations persist
 * a short-lived flag per user id after the admin re-confirms their password
 * (and TOTP, in a future epic). Sensitive actions consume the presence of the
 * marker — no plaintext password or TOTP code is stored.
 */
export type StepUpStore = {
  /**
   * Grants a step-up marker for `userId` with the given TTL in seconds.
   * Calling grant on an existing marker refreshes the TTL.
   */
  grant(userId: string, ttlSeconds: number): Promise<void>;

  /**
   * Checks whether the step-up marker for `userId` is still valid.
   * Does not consume the marker — Phase B uses time-boxed reuse.
   */
  has(userId: string): Promise<boolean>;

  /**
   * Removes the step-up marker for `userId`. Used by tests and explicit
   * invalidation flows (e.g. password reset).
   */
  revoke(userId: string): Promise<void>;
};
