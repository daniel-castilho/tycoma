import type { MediaUsageLookup } from "../domain/types";

export function createContentUsageLookup(deps: {
  findPostIdsUsingMedia: (mediaId: string) => Promise<string[]>;
  findPageIdsUsingMedia: (mediaId: string) => Promise<string[]>;
  findEntryIdsUsingMedia: (mediaId: string) => Promise<string[]>;
}): MediaUsageLookup {
  return {
    async findUsages(mediaId) {
      const [postIds, pageIds, entryIds] = await Promise.all([
        deps.findPostIdsUsingMedia(mediaId),
        deps.findPageIdsUsingMedia(mediaId),
        deps.findEntryIdsUsingMedia(mediaId),
      ]);
      return [
        ...postIds.map((id) => ({ type: "post" as const, id })),
        ...pageIds.map((id) => ({ type: "page" as const, id })),
        ...entryIds.map((id) => ({ type: "entry" as const, id })),
      ];
    },
  };
}
