import { listAuditEvents, recordAuditEvent } from "@/modules/audit/application";
import { createAuthApplication } from "@/modules/auth/application";
import { createContentApplication } from "@/modules/content/application";
import { createMediaApplication } from "@/modules/media/application";

/**
 * Framework composition root. This is the single place where cross-module
 * wiring happens: the audit module's writer is injected into the other modules
 * through their domain ports. Modules never import another module's
 * `application` or `infrastructure` directly.
 */
export const auth = createAuthApplication(recordAuditEvent);
export const content = createContentApplication(recordAuditEvent);
export const media = createMediaApplication(recordAuditEvent);

export const audit = {
  listAuditEvents,
};