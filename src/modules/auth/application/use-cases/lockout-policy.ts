/**
 * Phase B progressive lockout policy:
 *
 * - 10 failures within 1 hour (the existing login limiter's window) triggers
 *   an extended block of 30 minutes.
 * - Successful login / password reset clears the counter and any block.
 *
 * The failure counter window is intentionally aligned with the existing
 * `LOGIN_RATE_LIMIT.windowSeconds` so the lockout follows the rate-limit
 * ceiling, not a separate clock.
 */
export const LOCKOUT_FAILURE_THRESHOLD = 10;
export const LOCKOUT_FAILURE_WINDOW_SECONDS = 60 * 60;
export const LOCKOUT_BLOCK_SECONDS = 60 * 30;

export const LOGIN_LOCKOUT_POLICY = {
  threshold: LOCKOUT_FAILURE_THRESHOLD,
  windowSeconds: LOCKOUT_FAILURE_WINDOW_SECONDS,
  blockSeconds: LOCKOUT_BLOCK_SECONDS,
} as const;
