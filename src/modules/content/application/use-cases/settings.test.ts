import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AuditEventWrite, AuditEventWriter } from "../../../audit/domain/types.ts";
import type { SettingsRepository } from "../../domain/types.ts";
import { createGetSettings, createTouchSitemap, createUpdateSettings } from "./settings.ts";

function memorySettings(seed: Record<string, string> = {}) {
  const rows = { ...seed };
  const repo: SettingsRepository = {
    async getAll() {
      return { ...rows };
    },
    async setMany(entries) {
      Object.assign(rows, entries);
    },
  };
  return { rows, repo };
}

function memoryAudit(): { events: AuditEventWrite[]; writer: AuditEventWriter } {
  const events: AuditEventWrite[] = [];
  return {
    events,
    writer: {
      async record(event) {
        events.push(event);
      },
    },
  };
}

describe("getSettings", () => {
  it("returns defaults for unset keys", async () => {
    const { repo } = memorySettings();
    const settings = await createGetSettings(repo)();
    assert.equal(settings.title, "Tycoma");
    assert.equal(settings.timezone, "UTC");
    assert.equal(settings.baseUrl, "");
    assert.equal(settings.sitemapGeneratedAt, null);
  });

  it("returns stored values when present", async () => {
    const { repo } = memorySettings({ title: "My Site", baseUrl: "https://example.com" });
    const settings = await createGetSettings(repo)();
    assert.equal(settings.title, "My Site");
    assert.equal(settings.baseUrl, "https://example.com");
  });
});

describe("updateSettings", () => {
  it("persists only the provided fields", async () => {
    const { repo, rows } = memorySettings({ title: "Old" });
    const { writer } = memoryAudit();
    const getSettings = createGetSettings(repo);
    const updateSettings = createUpdateSettings(repo, writer, getSettings);
    await updateSettings({ description: "New description" });
    assert.equal(rows.title, "Old");
    assert.equal(rows.description, "New description");
  });

  it("returns the merged settings and audits content.settings_updated", async () => {
    const { repo } = memorySettings({ title: "Old" });
    const { writer, events } = memoryAudit();
    const getSettings = createGetSettings(repo);
    const updateSettings = createUpdateSettings(repo, writer, getSettings);
    const result = await updateSettings({ title: "New" }, "user-1");
    assert.equal(result.title, "New");
    assert.equal(events[0]!.eventType, "content.settings_updated");
    assert.equal(events[0]!.actorId, "user-1");
    assert.match(events[0]!.details ?? "", /"title"/);
  });

  it("stores null values as empty strings", async () => {
    const { repo, rows } = memorySettings({ title: "Old", logoMediaId: "media-1" });
    const { writer } = memoryAudit();
    const getSettings = createGetSettings(repo);
    const updateSettings = createUpdateSettings(repo, writer, getSettings);
    await updateSettings({ logoMediaId: null });
    assert.equal(rows.logoMediaId, "");
  });

  it("skips undefined fields so partial updates do not clobber them", async () => {
    const { repo, rows } = memorySettings({ title: "Old" });
    const { writer } = memoryAudit();
    const getSettings = createGetSettings(repo);
    const updateSettings = createUpdateSettings(repo, writer, getSettings);
    await updateSettings({ title: "New", defaultMetaTitle: undefined });
    assert.equal(rows.title, "New");
    assert.equal(rows.defaultMetaTitle, undefined);
  });
});

describe("touchSitemap", () => {
  it("records the generation time and audits content.sitemap_regenerated", async () => {
    const { repo, rows } = memorySettings();
    const { writer, events } = memoryAudit();
    const touchSitemap = createTouchSitemap(repo, writer);
    await touchSitemap("user-1");
    assert.ok(rows.sitemapGeneratedAt);
    assert.equal(events[0]!.eventType, "content.sitemap_regenerated");
    assert.equal(events[0]!.actorId, "user-1");
  });
});