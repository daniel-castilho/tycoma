import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { RateLimiter } from "../../../auth/domain/rate-limiter.ts";
import { UPLOAD_RATE_LIMIT, UPLOAD_RATE_WINDOW_SECONDS } from "../../domain/policies.ts";
import { createCheckUploadRate } from "./check-upload-rate.ts";

describe("checkUploadRate", () => {
  it("keys on (userId, ip) and passes the policy constants to the limiter", async () => {
    const calls: Array<{ key: string; limit: number; window: number }> = [];
    const limiter: RateLimiter = {
      async hit(key, limit, window) {
        calls.push({ key, limit, window });
        return { allowed: true, remaining: limit - 1 };
      },
    };
    const checkUploadRate = createCheckUploadRate(limiter);

    const allowed = await checkUploadRate("user-1", "127.0.0.1");

    assert.equal(allowed, true);
    assert.deepEqual(calls, [
      { key: "upload:user-1:127.0.0.1", limit: UPLOAD_RATE_LIMIT, window: UPLOAD_RATE_WINDOW_SECONDS },
    ]);
  });

  it("denies when the limiter denies", async () => {
    const limiter: RateLimiter = {
      async hit() {
        return { allowed: false, remaining: 0 };
      },
    };
    const checkUploadRate = createCheckUploadRate(limiter);
    const allowed = await checkUploadRate("user-1", "127.0.0.1");
    assert.equal(allowed, false);
  });
});