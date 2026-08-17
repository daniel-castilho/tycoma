import type { MediaReader } from "../../domain/types";

export function createGetMediaStorageStats(repo: MediaReader) {
  return async function getMediaStorageStats(): Promise<{
    count: number;
    totalBytes: number;
  }> {
    const [count, totalBytes] = await Promise.all([repo.count(), repo.totalBytes()]);
    return { count, totalBytes };
  };
}