import { prisma } from "@/shared/db/prisma";
import type { MediaUsageLookup } from "../domain/types";

export const contentUsageLookup: MediaUsageLookup = {
  async findUsages(mediaId) {
    const [posts, pages] = await Promise.all([
      prisma.post.findMany({
        where: { OR: [{ featuredImageId: mediaId }, { ogImageId: mediaId }] },
        select: { id: true },
      }),
      prisma.page.findMany({
        where: { OR: [{ featuredImageId: mediaId }, { ogImageId: mediaId }] },
        select: { id: true },
      }),
    ]);
    return [
      ...posts.map((p) => ({ type: "post" as const, id: p.id })),
      ...pages.map((p) => ({ type: "page" as const, id: p.id })),
    ];
  },
};
