import type { ContentStatus } from "../domain/types";

export function resolveStatus(input: {
  status: ContentStatus;
  scheduledAt?: Date | null;
}): { status: ContentStatus; publishedAt: Date | null; scheduledAt: Date | null } {
  if (input.status === "published") {
    return { status: "published", publishedAt: new Date(), scheduledAt: null };
  }
  if (input.status === "scheduled") {
    const when = input.scheduledAt ?? null;
    if (when && when.getTime() <= Date.now()) {
      return { status: "published", publishedAt: when, scheduledAt: null };
    }
    return { status: "scheduled", publishedAt: null, scheduledAt: when };
  }
  return { status: "draft", publishedAt: null, scheduledAt: input.scheduledAt ?? null };
}
