import { err, ok, type Result } from "@/shared/kernel/result";
import type { MediaAsset, MediaReader, MediaWriter } from "../../domain/types";

export function createUpdateMediaMetadata(repo: MediaReader & MediaWriter) {
  return async function updateMediaMetadata(
    id: string,
    input: { alt: string | null; caption: string | null },
  ): Promise<Result<MediaAsset>> {
    const current = await repo.findById(id);
    if (!current) return err("Media item not found.");
    const asset = await repo.update(id, {
      alt: input.alt ?? null,
      caption: input.caption ?? null,
    });
    return ok(asset);
  };
}