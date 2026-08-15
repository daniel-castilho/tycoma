import { prisma } from "@/shared/db/prisma";
import type { AuditEvent, AuditRepository } from "../domain/types";

const INSENSITIVE = "insensitive" as const;

export const prismaAuditRepository: AuditRepository = {
  async create(data) {
    const { id: _id, createdAt: _createdAt, ...rest } = data;
    return prisma.auditEvent.create({ data: rest }) as Promise<AuditEvent>;
  },
  async list(query) {
    const where = {
      eventType: query.eventType || undefined,
      entityType: query.entityType || undefined,
      createdAt: query.from || query.to ? { gte: query.from, lte: query.to } : undefined,
      OR: query.search
        ? [
            { details: { contains: query.search, mode: INSENSITIVE } },
            { eventType: { contains: query.search, mode: INSENSITIVE } },
            { entityId: { contains: query.search, mode: INSENSITIVE } },
          ]
        : undefined,
    };
    return prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: query.limit ?? 200,
    }) as Promise<AuditEvent[]>;
  },
};