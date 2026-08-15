export type AuditEvent = {
  id: string;
  actorId: string | null;
  eventType: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  createdAt: Date;
};

export type AuditEventWrite = Omit<AuditEvent, "id" | "createdAt">;

export type AuditListQuery = {
  eventType?: string;
  entityType?: string;
  from?: Date;
  to?: Date;
  search?: string;
  limit?: number;
};

export type AuditEventStore = {
  create(event: AuditEvent): Promise<AuditEvent>;
};

export type AuditEventReader = {
  list(query: AuditListQuery): Promise<AuditEvent[]>;
};

export type AuditRepository = AuditEventStore & AuditEventReader;

/**
 * Outbound port consumed by other modules' use cases. Implemented in
 * `audit/infrastructure` and injected through use-case factories.
 */
export type AuditEventWriter = {
  record(event: AuditEventWrite): Promise<void>;
};