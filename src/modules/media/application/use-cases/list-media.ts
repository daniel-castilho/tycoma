import type { MediaAsset, MediaRepository } from "../../domain/types";

export function createListMedia(repo: MediaRepository) {
  return async function listMedia(query: {
    search?: string;
    mimePrefix?: string;
  } = {}): Promise<MediaAsset[]> {
    return repo.list({
      search: query.search || undefined,
      mimePrefix: query.mimePrefix || undefined,
    });
  };
}