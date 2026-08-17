import { prisma } from "@/shared/db/prisma";
import { isObjectId } from "@/shared/kernel/object-id";
import type { MediaAsset, MediaRepository } from "../domain/types";

type MediaAssetRow = {
  id: string;
  filename: string;
  storageKey: string;
  url: string;
  mimeType: string;
  size: number;
  alt: string | null;
  caption: string | null;
  createdAt: Date;
};

function mapMediaAsset(row: MediaAssetRow): MediaAsset {
  return {
    id: row.id,
    filename: row.filename,
    storageKey: row.storageKey,
    url: row.url,
    mimeType: row.mimeType,
    size: row.size,
    alt: row.alt,
    caption: row.caption,
    createdAt: row.createdAt,
  };
}

export const prismaMediaRepository: MediaRepository = {
  async list(query) {
    const rows = await prisma.mediaAsset.findMany({
      where: {
        filename: query.search ? { contains: query.search, mode: "insensitive" } : undefined,
        mimeType: query.mimePrefix ? { startsWith: query.mimePrefix } : undefined,
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapMediaAsset);
  },
  async findById(id) {
    if (!isObjectId(id)) return null;
    const row = await prisma.mediaAsset.findUnique({ where: { id } });
    return row ? mapMediaAsset(row) : null;
  },
  async create(data) {
    return mapMediaAsset(await prisma.mediaAsset.create({ data }));
  },
  async update(id, data) {
    return mapMediaAsset(await prisma.mediaAsset.update({ where: { id }, data }));
  },
  async delete(id) {
    await prisma.mediaAsset.delete({ where: { id } });
  },
  async totalBytes() {
    const agg = await prisma.mediaAsset.aggregate({ _sum: { size: true } });
    return agg._sum.size ?? 0;
  },
  async count() {
    return prisma.mediaAsset.count();
  },
};
