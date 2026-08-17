import { STEP_UP_TTL_SECONDS } from "../../domain/policies";
import type { StepUpStore } from "../../domain/step-up";

export function createGetStepUpStatus(store: StepUpStore) {
  return async function getStepUpStatus(userId: string): Promise<{
    active: boolean;
    ttlSeconds: number;
  }> {
    const active = await store.has(userId);
    return { active, ttlSeconds: STEP_UP_TTL_SECONDS };
  };
}