import type { MediaAsset, MediaReader } from "../../domain/types";

export function createGetMedia(repo: MediaReader) {
  return async function getMedia(id: string): Promise<MediaAsset | null> {
    return repo.findById(id);
  };
}