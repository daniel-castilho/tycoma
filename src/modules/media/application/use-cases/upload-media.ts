import { err, ok, type Result } from "@/shared/kernel/result";
import { newObjectId } from "@/shared/db/object-id";
import type { AuditEventWriter } from "../../../audit/domain/types";
import type { MediaAsset, MediaRepository, ObjectStorage } from "../../domain/types";

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "audio/mpeg": "mp3",
  "application/pdf": "pdf",
};

const SAFE_EXT_PATTERN = /^[a-z0-9]{1,8}$/;

function safeExt(filename: string, mimeType: string): string {
  const fromName = filename.split(".").pop()?.toLowerCase();
  if (fromName && SAFE_EXT_PATTERN.test(fromName)) return fromName;
  return EXT_BY_MIME[mimeType] ?? "bin";
}

export function createUploadMedia(
  storage: ObjectStorage,
  repo: MediaRepository,
  audit: AuditEventWriter,
) {
  return async function uploadMedia(
    input: { filename: string; mimeType: string; size: number; body: Uint8Array },
    actorId?: string | null,
  ): Promise<Result<MediaAsset>> {
    const filename = input.filename.trim();
    if (!filename) return err("A filename is required.");
    if (!input.mimeType) return err("A MIME type is required.");
    if (input.size <= 0) return err("The file appears to be empty.");

    const storageKey = `media/${newObjectId()}.${safeExt(filename, input.mimeType)}`;
    const { url } = await storage.put(storageKey, input.body, input.mimeType);
    const asset = await repo.create({
      filename,
      storageKey,
      url,
      mimeType: input.mimeType,
      size: input.size,
      alt: null,
      caption: null,
    });
    await audit.record({
      actorId: actorId ?? null,
      eventType: "media.uploaded",
      entityType: "media",
      entityId: asset.id,
      details: JSON.stringify({ filename, size: asset.size }),
    });
    return ok(asset);
  };
}