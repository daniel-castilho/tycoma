import type { MediaAsset, MediaRepository } from "../../domain/types";

export function createGetMedia(repo: MediaRepository) {
  return async function getMedia(id: string): Promise<MediaAsset | null> {
    return repo.findById(id);
  };
}