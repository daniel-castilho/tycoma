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

export type AuditRepository = {
  create(event: AuditEvent): Promise<AuditEvent>;
  list(query: {
    eventType?: string;
    entityType?: string;
    from?: Date;
    to?: Date;
    search?: string;
    limit?: number;
  }): Promise<AuditEvent[]>;
};

/**
 * Outbound port consumed by other modules' use cases. Implemented in
 * `audit/infrastructure` and injected through use-case factories.
 */
export type AuditEventWriter = {
  record(event: AuditEventWrite): Promise<void>;
};