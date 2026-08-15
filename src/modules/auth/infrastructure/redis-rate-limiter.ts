import { getRedis } from "@/shared/cache/redis";
import type { RateLimiter } from "../domain/rate-limiter";

export const redisRateLimiter: RateLimiter = {
  async hit(key, limit, windowSeconds) {
    const redis = getRedis();
    const n = await redis.incr(key);
    if (n === 1) {
      await redis.expire(key, windowSeconds);
    }
    return { allowed: n <= limit, remaining: Math.max(0, limit - n) };
  },
};
