import type { AuditEventWriter } from "@/modules/audit/domain/types";
import type { SettingsRepository, SiteSettings } from "../../domain/types";

const defaults: SiteSettings = {
  title: "Tycoma",
  description: "",
  logoMediaId: null,
  faviconMediaId: null,
  timezone: "UTC",
  baseUrl: "",
  defaultMetaTitle: "",
  defaultMetaDescription: "",
  sitemapGeneratedAt: null,
};

export function createGetSettings(settings: SettingsRepository) {
  return async function getSettings(): Promise<SiteSettings> {
    const raw = await settings.getAll();
    return {
      title: raw.title ?? defaults.title,
      description: raw.description ?? defaults.description,
      logoMediaId: raw.logoMediaId || null,
      faviconMediaId: raw.faviconMediaId || null,
      timezone: raw.timezone ?? defaults.timezone,
      baseUrl: raw.baseUrl ?? defaults.baseUrl,
      defaultMetaTitle: raw.defaultMetaTitle ?? defaults.defaultMetaTitle,
      defaultMetaDescription: raw.defaultMetaDescription ?? defaults.defaultMetaDescription,
      sitemapGeneratedAt: raw.sitemapGeneratedAt || null,
    };
  };
}

export function createUpdateSettings(settings: SettingsRepository, audit: AuditEventWriter) {
  return async function updateSettings(
    input: Partial<SiteSettings>,
    actorId?: string | null,
  ): Promise<SiteSettings> {
    const entries: Record<string, string> = {};
    for (const [key, value] of Object.entries(input)) {
      entries[key] = value === null ? "" : String(value);
    }
    await settings.setMany(entries);
    const current = await createGetSettings(settings)();
    await audit.record({
      actorId: actorId ?? null,
      eventType: "content.settings_updated",
      entityType: "settings",
      entityId: null,
      details: JSON.stringify({ fields: Object.keys(input) }),
    });
    return current;
  };
}

export function createTouchSitemap(settings: SettingsRepository, audit: AuditEventWriter) {
  return async function touchSitemap(actorId?: string | null): Promise<void> {
    await settings.setMany({ sitemapGeneratedAt: new Date().toISOString() });
    await audit.record({
      actorId: actorId ?? null,
      eventType: "content.sitemap_regenerated",
      entityType: "settings",
      entityId: null,
      details: null,
    });
  };
}
