import type { RateLimiter } from "../../../auth/domain/rate-limiter";
import { UPLOAD_RATE_LIMIT, UPLOAD_RATE_WINDOW_SECONDS } from "../../domain/policies";

/**
 * Media upload rate limiting, per (userId, ip) pair. Budget: 30 requests per
 * 15 minutes. The policy constants live in the media domain; the underlying
 * counter is injected through the shared `RateLimiter` port.
 */
export function createCheckUploadRate(limiter: RateLimiter) {
  return async function checkUploadRate(userId: string, ip: string): Promise<boolean> {
    const decision = await limiter.hit(
      `upload:${userId}:${ip}`,
      UPLOAD_RATE_LIMIT,
      UPLOAD_RATE_WINDOW_SECONDS,
    );
    return decision.allowed;
  };
}