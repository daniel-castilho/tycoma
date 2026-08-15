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

export function createUpdateSettings(settings: SettingsRepository) {
  return async function updateSettings(input: SiteSettings): Promise<SiteSettings> {
    const entries: Record<string, string> = {
      title: input.title,
      description: input.description,
      logoMediaId: input.logoMediaId ?? "",
      faviconMediaId: input.faviconMediaId ?? "",
      timezone: input.timezone,
      baseUrl: input.baseUrl,
      defaultMetaTitle: input.defaultMetaTitle,
      defaultMetaDescription: input.defaultMetaDescription,
      sitemapGeneratedAt: input.sitemapGeneratedAt ?? "",
    };
    await settings.setMany(entries);
    return input;
  };
}

export function createTouchSitemap(settings: SettingsRepository) {
  return async function touchSitemap(): Promise<void> {
    await settings.setMany({ sitemapGeneratedAt: new Date().toISOString() });
  };
}
