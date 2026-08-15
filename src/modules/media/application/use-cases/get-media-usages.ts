import type { MediaUsageLookup } from "../../domain/types";

export function createGetMediaUsages(usage: MediaUsageLookup) {
  return async function getMediaUsages(mediaId: string) {
    return usage.findUsages(mediaId);
  };
}