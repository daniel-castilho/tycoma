import Redis from "ioredis";
import { env } from "@/shared/env-instance";

let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    });
  }
  return client;
}
