import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AuditEvent, AuditEventWrite, AuditRepository } from "../../domain/types.ts";
import { createAuditEventWriter } from "./record-audit-event.ts";
import { createListAuditEvents } from "./list-audit-events.ts";

function memoryAudit(seed: AuditEvent[] = []) {
  const rows = [...seed];
  const repo: AuditRepository = {
    async create(event) {
      rows.push(event);
      return event;
    },
    async list(query) {
      return rows
        .filter((row) => {
          if (query.eventType && row.eventType !== query.eventType) return false;
          if (query.entityType && row.entityType !== query.entityType) return false;
          if (query.search && !JSON.stringify(row.details).includes(query.search)) return false;
          if (query.from && row.createdAt < query.from) return false;
          if (query.to && row.createdAt > query.to) return false;
          return true;
        })
        .slice(0, query.limit ?? rows.length);
    },
  };
  return { rows, repo };
}

const write: AuditEventWrite = {
  actorId: "user-1",
  eventType: "content.post_created",
  entityType: "post",
  entityId: "post-1",
  details: JSON.stringify({ title: "Hello" }),
};

describe("recordAuditEvent", () => {
  it("persists the event with a generated id and createdAt", async () => {
    const audit = memoryAudit();
    const writer = createAuditEventWriter(audit.repo);
    await writer.record(write);
    const stored = audit.rows[0]!;
    assert.match(stored.id, /^[a-f0-9]{24}$/);
    assert.ok(stored.createdAt instanceof Date);
    assert.equal(stored.eventType, write.eventType);
    assert.equal(stored.actorId, write.actorId);
    assert.equal(stored.entityId, write.entityId);
  });

  it("records an event with no actor as null", async () => {
    const audit = memoryAudit();
    const writer = createAuditEventWriter(audit.repo);
    await writer.record({ ...write, actorId: null });
    assert.equal(audit.rows[0]!.actorId, null);
  });
});

describe("listAuditEvents", () => {
  const now = new Date("2024-06-01T12:00:00Z");
  const seed: AuditEvent[] = [
    {
      id: "1",
      actorId: "user-1",
      eventType: "auth.login",
      entityType: "user",
      entityId: "user-1",
      details: null,
      createdAt: now,
    },
    {
      id: "2",
      actorId: "user-1",
      eventType: "content.post_created",
      entityType: "post",
      entityId: "post-1",
      details: '{"title":"Hello"}',
      createdAt: new Date("2024-06-02T12:00:00Z"),
    },
    {
      id: "3",
      actorId: null,
      eventType: "content.settings_updated",
      entityType: "settings",
      entityId: null,
      details: '{"fields":["title"]}',
      createdAt: new Date("2024-06-03T12:00:00Z"),
    },
  ];

  it("filters by eventType and entityType", async () => {
    const { repo } = memoryAudit(seed);
    const list = createListAuditEvents(repo);
    const result = await list({ eventType: "content.post_created", entityType: "post" });
    assert.equal(result.length, 1);
    assert.equal(result[0]!.id, "2");
  });

  it("parses string from/to bounds into dates", async () => {
    const { repo } = memoryAudit(seed);
    const list = createListAuditEvents(repo);
    const result = await list({ from: "2024-06-02T00:00:00Z", to: "2024-06-02T23:59:59Z" });
    assert.deepEqual(result.map((e) => e.id), ["2"]);
  });

  it("drops invalid date bounds instead of passing NaN", async () => {
    const { repo } = memoryAudit(seed);
    const list = createListAuditEvents(repo);
    const result = await list({ from: "not-a-date" });
    assert.equal(result.length, 3);
  });

  it("applies a search across details", async () => {
    const { repo } = memoryAudit(seed);
    const list = createListAuditEvents(repo);
    const result = await list({ search: "Hello" });
    assert.deepEqual(result.map((e) => e.id), ["2"]);
  });

  it("limits the result set", async () => {
    const { repo } = memoryAudit(seed);
    const list = createListAuditEvents(repo);
    const result = await list({ limit: 2 });
    assert.equal(result.length, 2);
  });
});