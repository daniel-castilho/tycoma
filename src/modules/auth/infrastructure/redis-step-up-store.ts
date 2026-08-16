import { getRedis } from "@/shared/cache/redis";
import type { StepUpStore } from "../domain/step-up";

const KEY_PREFIX = "stepup:";

export const redisStepUpStore: StepUpStore = {
  async grant(userId, ttlSeconds) {
    const redis = getRedis();
    await redis.set(`${KEY_PREFIX}${userId}`, "1", "EX", ttlSeconds);
  },
  async has(userId) {
    const redis = getRedis();
    const v = await redis.get(`${KEY_PREFIX}${userId}`);
    return v !== null;
  },
  async revoke(userId) {
    const redis = getRedis();
    await redis.del(`${KEY_PREFIX}${userId}`);
  },
};
