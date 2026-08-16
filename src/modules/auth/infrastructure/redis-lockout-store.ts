import { getRedis } from "@/shared/cache/redis";
import type { LockoutStore } from "../domain/lockout";

const FAIL_PREFIX = "lockfail:";
const BLOCK_PREFIX = "lockblock:";

export const redisLockoutStore: LockoutStore = {
  async countFailure(key, windowSeconds) {
    const redis = getRedis();
    const fullKey = `${FAIL_PREFIX}${key}`;
    const n = await redis.incr(fullKey);
    if (n === 1) {
      await redis.expire(fullKey, windowSeconds);
    }
    return n;
  },
  async isBlocked(key) {
    const redis = getRedis();
    return (await redis.exists(`${BLOCK_PREFIX}${key}`)) === 1;
  },
  async block(key, blockSeconds) {
    const redis = getRedis();
    await redis.set(`${BLOCK_PREFIX}${key}`, "1", "EX", blockSeconds);
  },
  async reset(key) {
    const redis = getRedis();
    await redis.del(`${FAIL_PREFIX}${key}`);
    await redis.del(`${BLOCK_PREFIX}${key}`);
  },
};
