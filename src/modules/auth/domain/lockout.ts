/**
 * Domain port for progressive account lockout. Phase B policy:
 *
 * - `countFailure(key, windowSeconds)` records a failure and returns the
 *   rolling count. Existing window TTL is reused when present.
 * - `isBlocked(key)` returns true if an extended block has been applied.
 * - `block(key, blockSeconds)` applies an extended block; subsequent
 *   `isBlocked` calls return true until the block expires.
 * - `reset(key)` clears both the failure counter and the block (called on
 *   successful login / password reset).
 */
export type LockoutStore = {
  countFailure(key: string, windowSeconds: number): Promise<number>;
  isBlocked(key: string): Promise<boolean>;
  block(key: string, blockSeconds: number): Promise<void>;
  reset(key: string): Promise<void>;
};
