import { newObjectId } from "@/shared/db/object-id";
import type { AuditEventStore, AuditEventWriter } from "../../domain/types";

export function createAuditEventWriter(store: AuditEventStore): AuditEventWriter {
  return {
    async record(event) {
      await store.create({ ...event, id: newObjectId(), createdAt: new Date() });
    },
  };
}