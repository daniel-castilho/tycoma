import { prismaAuditRepository } from "../infrastructure/prisma-audit-repository";
import { createAuditEventWriter } from "./use-cases/record-audit-event";
import { createListAuditEvents } from "./use-cases/list-audit-events";

export const recordAuditEvent = createAuditEventWriter(prismaAuditRepository);
export const listAuditEvents = createListAuditEvents(prismaAuditRepository);

export type { AuditEvent, AuditEventWriter } from "../domain/types";