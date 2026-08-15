import type { AuditEventReader, AuditEventStore } from "../domain/types";
import { createAuditEventWriter } from "./use-cases/record-audit-event";
import { createListAuditEvents } from "./use-cases/list-audit-events";

/**
 * Composition root for the `audit` module. Like the other modules, it exposes
 * a factory so the framework layer (`src/app/_lib/modules.ts`) can inject the
 * infrastructure adapters. This keeps the module free of direct dependencies
 * on Prisma at composition time and lets tests swap in-memory stores.
 */
export function createAuditApplication(deps: {
  store: AuditEventStore;
  reader: AuditEventReader;
}) {
  return {
    recordAuditEvent: createAuditEventWriter(deps.store),
    listAuditEvents: createListAuditEvents(deps.reader),
  };
}

export type { AuditEvent, AuditEventWriter } from "../domain/types";