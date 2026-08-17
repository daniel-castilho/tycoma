import type { AuditEventWriter } from "@/modules/audit/domain/types";
import type { RateLimiter } from "@/modules/auth/domain/rate-limiter";
import type { StepUpStore } from "@/modules/auth/domain/step-up";
import { prismaMediaRepository } from "../infrastructure/prisma-media-repository";
import { s3ObjectStorage } from "../infrastructure/s3-object-storage";
import { attachSignedUrl } from "./use-cases/attach-signed-url";
import { createCheckUploadRate } from "./use-cases/check-upload-rate";
import { createDeleteMedia } from "./use-cases/delete-media";
import { createGetMedia } from "./use-cases/get-media";
import { createGetMediaUsages } from "./use-cases/get-media-usages";
import { createGetMediaStorageStats } from "./use-cases/media-storage-stats";
import { createListMedia } from "./use-cases/list-media";
import { createUpdateMediaMetadata } from "./use-cases/update-media-metadata";
import { createUploadMedia } from "./use-cases/upload-media";

/**
 * Composition root for the `media` module. Wires this module's own
 * infrastructure adapters into its use cases. Cross-module ports (the audit
 * writer, the content-side media-usage lookup, and the auth step-up store)
 * are injected — the wiring itself lives in the framework layer
 * (`src/app/_lib/modules.ts`).
 */
export function createMediaApplication(deps: {
  auditEventWriter: AuditEventWriter;
  contentUsageLookup: import("../domain/types").MediaUsageLookup;
  stepUp: StepUpStore;
  rateLimiter: RateLimiter;
}) {
  const { auditEventWriter, contentUsageLookup, stepUp, rateLimiter } = deps;
  const listMedia = createListMedia(prismaMediaRepository);
  return {
    uploadMedia: createUploadMedia(s3ObjectStorage, prismaMediaRepository, auditEventWriter),
    checkUploadRate: createCheckUploadRate(rateLimiter),
    listMedia,
    getMedia: createGetMedia(prismaMediaRepository),
    listMediaWithUrls: async (query?: { search?: string; mimePrefix?: string }) =>
      Promise.all((await listMedia(query)).map((a) => attachSignedUrl(s3ObjectStorage, a))),
    getMediaWithUrl: async (id: string) => {
      const asset = await prismaMediaRepository.findById(id);
      if (!asset) return null;
      return attachSignedUrl(s3ObjectStorage, asset);
    },
    getMediaUsages: createGetMediaUsages(contentUsageLookup),
    updateMediaMetadata: createUpdateMediaMetadata(prismaMediaRepository),
    deleteMedia: createDeleteMedia(
      prismaMediaRepository,
      contentUsageLookup,
      s3ObjectStorage,
      auditEventWriter,
      stepUp,
    ),
    getMediaStorageStats: createGetMediaStorageStats(prismaMediaRepository),
  };
}

export type MediaApplication = ReturnType<typeof createMediaApplication>;

export type { MediaAsset, MediaUsageLookup } from "../domain/types";