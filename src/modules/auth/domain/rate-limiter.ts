export type RateLimiter = {
  hit(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number }>;
};
