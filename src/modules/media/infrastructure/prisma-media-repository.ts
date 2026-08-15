import { prisma } from "@/shared/db/prisma";
import type { MediaAsset, MediaRepository } from "../domain/types";

export const prismaMediaRepository: MediaRepository = {
  async list(query) {
    return prisma.mediaAsset.findMany({
      where: {
        filename: query.search ? { contains: query.search, mode: "insensitive" } : undefined,
        mimeType: query.mimePrefix ? { startsWith: query.mimePrefix } : undefined,
      },
      orderBy: { createdAt: "desc" },
    }) as Promise<MediaAsset[]>;
  },
  async findById(id) {
    return prisma.mediaAsset.findUnique({ where: { id } });
  },
  async create(data) {
    return prisma.mediaAsset.create({ data });
  },
  async update(id, data) {
    return prisma.mediaAsset.update({ where: { id }, data });
  },
  async delete(id) {
    await prisma.mediaAsset.delete({ where: { id } });
  },
  async totalBytes() {
    const agg = await prisma.mediaAsset.aggregate({ _sum: { size: true } });
    return agg._sum.size ?? 0;
  },
};
