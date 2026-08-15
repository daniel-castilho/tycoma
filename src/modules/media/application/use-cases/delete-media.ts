import { err, ok, type Result } from "../../../../shared/kernel/result.ts";
import type { AuditEventWriter } from "../../../audit/domain/types";
import type { MediaRepository, MediaUsageLookup, ObjectStorage } from "../../domain/types";

export function createDeleteMedia(
  repo: MediaRepository,
  usage: MediaUsageLookup,
  storage: ObjectStorage,
  audit: AuditEventWriter,
) {
  return async function deleteMedia(id: string, actorId?: string | null): Promise<Result<{ ok: true }>> {
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