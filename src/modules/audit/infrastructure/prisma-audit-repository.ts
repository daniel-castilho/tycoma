import { prisma } from "@/shared/db/prisma";
import type { AuditEvent, AuditRepository } from "../domain/types";

const INSENSITIVE = "insensitive" as const;

function mapAuditEvent(row: {
  id: string;
  actorId: string | null;
  eventType: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  createdAt: Date;
}): AuditEvent {
  return {
    id: row.id,
    actorId: row.actorId,
    eventType: row.eventType,
    entityType: row.entityType,
    entityId: row.entityId,
    details: row.details,
    createdAt: row.createdAt,
  };
}

export const prismaAuditRepository: AuditRepository = {
  async create(data) {
    const { id: _id, createdAt: _createdAt, ...rest } = data;
    return mapAuditEvent(await prisma.auditEvent.create({ data: rest }));
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
    const rows = await prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: query.limit ?? 200,
    });
    return rows.map(mapAuditEvent);
  },
};