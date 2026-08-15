import type { AuditEventWriter } from "@/modules/audit/domain/types";
import { prismaMediaRepository } from "../infrastructure/prisma-media-repository";
import { s3ObjectStorage } from "../infrastructure/s3-object-storage";
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
 * writer and the content-side media-usage lookup) are injected — the wiring
 * itself lives in the framework layer (`src/app/_lib/modules.ts`).
 */
export function createMediaApplication(deps: {
  auditEventWriter: AuditEventWriter;
  contentUsageLookup: import("../domain/types").MediaUsageLookup;
}) {
  const { auditEventWriter, contentUsageLookup } = deps;
  return {
    uploadMedia: createUploadMedia(s3ObjectStorage, prismaMediaRepository, auditEventWriter),
    listMedia: createListMedia(prismaMediaRepository),
    getMedia: createGetMedia(prismaMediaRepository),
    getMediaUsages: createGetMediaUsages(contentUsageLookup),
    updateMediaMetadata: createUpdateMediaMetadata(prismaMediaRepository),
    deleteMedia: createDeleteMedia(
      prismaMediaRepository,
      contentUsageLookup,
      s3ObjectStorage,
      auditEventWriter,
    ),
    getMediaStorageStats: createGetMediaStorageStats(prismaMediaRepository),
  };
}

export type MediaApplication = ReturnType<typeof createMediaApplication>;

export type { MediaAsset, MediaUsageLookup } from "../domain/types";