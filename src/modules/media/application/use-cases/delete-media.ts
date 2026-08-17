import { err, ok, type Result } from "@/shared/kernel/result";
import type { AuditEventWriter } from "../../../audit/domain/types";
import type { StepUpStore } from "../../../auth/domain/step-up";
import type { MediaReader, MediaUsageLookup, MediaWriter, ObjectStorage } from "../../domain/types";

export function createDeleteMedia(
  repo: MediaReader & MediaWriter,
  usage: MediaUsageLookup,
  storage: ObjectStorage,
  audit: AuditEventWriter,
  stepUp: StepUpStore,
) {
  return async function deleteMedia(id: string, actorId?: string | null): Promise<Result<{ ok: true }>> {
    // Phase C: destructive deletes require a recent step-up (Redis TTL 10 min,
    // time-boxed reuse — see `STEP_UP_TTL_SECONDS` in `auth/application/use-cases/step-up.ts`).
    if (!(await stepUp.has(actorId ?? ""))) {
      return err("Please confirm your current password before this action.");
    }
    const asset = await repo.findById(id);
    if (!asset) return err("Media item not found.");
    const usages = await usage.findUsages(id);
    if (usages.length > 0) {
      return err("This media item is used by content. Remove those references first.");
    }
    await storage.delete(asset.storageKey);
    await repo.delete(id);
    await audit.record({
      actorId: actorId ?? null,
      eventType: "media.deleted",
      entityType: "media",
      entityId: id,
      details: JSON.stringify({ filename: asset.filename }),
    });
    return ok({ ok: true });
  };
}