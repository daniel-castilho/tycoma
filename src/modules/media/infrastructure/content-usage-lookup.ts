import type { MediaUsageLookup } from "../domain/types";

export function createContentUsageLookup(deps: {
  findPostIdsUsingMedia: (mediaId: string) => Promise<string[]>;
  findPageIdsUsingMedia: (mediaId: string) => Promise<string[]>;
}): MediaUsageLookup {
  return {
    async findUsages(mediaId) {
      const [postIds, pageIds] = await Promise.all([
        deps.findPostIdsUsingMedia(mediaId),
        deps.findPageIdsUsingMedia(mediaId),
      ]);
      return [
        ...postIds.map((id) => ({ type: "post" as const, id })),
        ...pageIds.map((id) => ({ type: "page" as const, id })),
      ];
    },
  };
}
