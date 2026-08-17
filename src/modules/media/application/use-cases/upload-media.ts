import { err, ok, type Result } from "@/shared/kernel/result";
import { newObjectId } from "@/shared/kernel/object-id";
import type { AuditEventWriter } from "../../../audit/domain/types";
import type { MediaAsset, MediaWriter, ObjectStorage } from "../../domain/types";

/**
 * Phase A upload policy. SVG is blocked (no SVG sanitizer), video/audio/pdf
 * removed from the allowlist — they can be re-added in a follow-up with a
 * human-approved need. Max upload size is 10 MiB.
 */
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const EXT_BY_MIME: Record<AllowedMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Magic-byte sniffers per allowed MIME type. Returns the MIME type if the
 * bytes match the expected signature, otherwise `null`. Client-declared
 * `Content-Type` is not trusted — only the file body decides.
 */
export function sniffMimeType(body: Uint8Array): AllowedMimeType | null {
  if (body.length >= 3 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    body.length >= 8 &&
    body[0] === 0x89 &&
    body[1] === 0x50 &&
    body[2] === 0x4e &&
    body[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    body.length >= 6 &&
    body[0] === 0x47 &&
    body[1] === 0x49 &&
    body[2] === 0x46 &&
    body[3] === 0x38 &&
    (body[4] === 0x39 || body[4] === 0x37) &&
    body[5] === 0x61
  ) {
    return "image/gif";
  }
  if (
    body.length >= 12 &&
    body[0] === 0x52 &&
    body[1] === 0x49 &&
    body[2] === 0x46 &&
    body[3] === 0x46 &&
    body[8] === 0x57 &&
    body[9] === 0x45 &&
    body[10] === 0x42 &&
    body[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export function createUploadMedia(
  storage: ObjectStorage,
  repo: MediaWriter,
  audit: AuditEventWriter,
) {
  return async function uploadMedia(
    input: { filename: string; mimeType: string; size: number; body: Uint8Array },
    actorId?: string | null,
  ): Promise<Result<MediaAsset>> {
    const filename = input.filename.trim();
    if (!filename) return err("A filename is required.");
    if (!input.mimeType) return err("A MIME type is required.");

    // Phase A: SVG is blocked outright.
    if (input.mimeType === "image/svg+xml" || /\.svg$/i.test(filename)) {
      return err("SVG uploads are not allowed.");
    }
    if (input.size <= 0) return err("The file appears to be empty.");
    if (input.size > MAX_UPLOAD_BYTES) {
      return err(`The file exceeds the ${MAX_UPLOAD_BYTES} byte upload limit.`);
    }

    const detected = sniffMimeType(input.body);
    if (!detected) {
      return err("The file type is not supported.");
    }
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(input.mimeType)) {
      return err(`The MIME type "${input.mimeType}" is not supported.`);
    }
    if (detected !== input.mimeType) {
      return err(
        `The file content does not match its declared type (declared: ${input.mimeType}, detected: ${detected}).`,
      );
    }

    const ext = EXT_BY_MIME[detected];
    const storageKey = `media/${newObjectId()}.${ext}`;
    const { url } = await storage.put(storageKey, input.body, detected);
    const asset = await repo.create({
      filename,
      storageKey,
      url,
      mimeType: detected,
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