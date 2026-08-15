import { randomUUID } from "node:crypto";
import type { AuditEventWriter, AuditRepository } from "../../domain/types";

const oid = () => randomUUID().replace(/-/g, "").slice(0, 24);

export function createAuditEventWriter(repo: AuditRepository): AuditEventWriter {
  return {
    async record(event) {
      await repo.create({ ...event, id: oid(), createdAt: new Date() });
    },
  };
}