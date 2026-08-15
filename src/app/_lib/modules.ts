import { createAuditApplication } from "@/modules/audit/application";
import { prismaAuditRepository } from "@/modules/audit/infrastructure/prisma-audit-repository";
import { createAuthApplication } from "@/modules/auth/application";
import { createContentApplication } from "@/modules/content/application";
import { prismaPageRepository, prismaPostRepository } from "@/modules/content/infrastructure/prisma-content-repositories";
import { createMediaApplication } from "@/modules/media/application";
import { createContentUsageLookup } from "@/modules/media/infrastructure/content-usage-lookup";

/**
 * Framework composition root. This is the single place where cross-module
 * wiring happens: the audit module's writer is injected into the other modules
 * through their domain ports. Modules never import another module's
 * `application` or `infrastructure` directly.
 */
const auditApp = createAuditApplication({
  store: prismaAuditRepository,
  reader: prismaAuditRepository,
});
const { recordAuditEvent } = auditApp;

const contentUsageLookup = createContentUsageLookup({
  findPostIdsUsingMedia: (mediaId) => prismaPostRepository.idsUsingMedia(mediaId),
  findPageIdsUsingMedia: (mediaId) => prismaPageRepository.idsUsingMedia(mediaId),
});

export const auth = createAuthApplication(recordAuditEvent);
export const content = createContentApplication(recordAuditEvent);
export const media = createMediaApplication({ auditEventWriter: recordAuditEvent, contentUsageLookup });

export const audit = {
  listAuditEvents: auditApp.listAuditEvents,
};