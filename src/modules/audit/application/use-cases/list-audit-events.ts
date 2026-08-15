import type { AuditEvent, AuditRepository } from "../../domain/types";

export type ListAuditEventsQuery = {
  eventType?: string;
  entityType?: string;
  from?: string;
  to?: string;
  search?: string;
  limit?: number;
};

export function createListAuditEvents(repo: AuditRepository) {
  return async function listAuditEvents(query: ListAuditEventsQuery = {}): Promise<AuditEvent[]> {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    return repo.list({
      eventType: query.eventType || undefined,
      entityType: query.entityType || undefined,
      from: from && !Number.isNaN(from.getTime()) ? from : undefined,
      to: to && !Number.isNaN(to.getTime()) ? to : undefined,
      search: query.search || undefined,
      limit: query.limit,
    });
  };
}