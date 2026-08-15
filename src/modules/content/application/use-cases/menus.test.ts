import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AuditEventWrite, AuditEventWriter } from "../../../audit/domain/types.ts";
import type { Menu, MenuItem, MenuItemDraft, MenuRepository } from "../../domain/types.ts";
import { createDeleteMenu, createGetMenuItems, createListMenus, createSaveMenu, createSaveMenuItems } from "./menus.ts";

function memoryMenus(seed: Menu[] = [], seedItems: MenuItem[] = []) {
  const menus = [...seed];
  const items = [...seedItems];
  const repo: MenuRepository = {
    async list() {
      return menus;
    },
    async findById(id) {
      return menus.find((m) => m.id === id) ?? null;
    },
    async create(data) {
      menus.push(data);
      return data;
    },
    async update(id, data) {
      const idx = menus.findIndex((m) => m.id === id);
      if (idx < 0) throw new Error("missing");
      menus[idx] = { ...menus[idx]!, ...data };
      return menus[idx]!;
    },
    async delete(id) {
      const idx = menus.findIndex((m) => m.id === id);
      if (idx >= 0) menus.splice(idx, 1);
    },
    async listItems(menuId) {
      return items.filter((i) => i.menuId === menuId);
    },
    async replaceItems(_menuId, rows) {
      items.splice(0, items.length, ...rows);
    },
  };
  return { menus, items, repo };
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

const menu = (id: string, name = "Main"): Menu => ({ id, name, slug: name.toLowerCase() });

const draft = (overrides: Partial<MenuItemDraft> = {}): MenuItemDraft => ({
  label: "Home",
  type: "custom",
  refId: null,
  url: "/",
  sortOrder: 0,
  children: [],
  ...overrides,
});

describe("saveMenuItems", () => {
  it("flattens a nested tree into rows with correct parentId and sortOrder", async () => {
    const { repo, items } = memoryMenus([menu("menu-1")]);
    const { writer, events } = memoryAudit();
    const saveMenuItems = createSaveMenuItems(repo, writer);

    const child = draft({ label: "About", url: "/about", sortOrder: 1 });
    const result = await saveMenuItems(
      "menu-1",
      [draft({ children: [child] }), draft({ label: "Contact", url: "/contact", sortOrder: 2 })],
      "user-1",
    );

    assert.equal(result.ok, true);
    assert.equal(items.length, 3);
    const root = items.find((i) => i.label === "Home")!;
    const nested = items.find((i) => i.label === "About")!;
    const second = items.find((i) => i.label === "Contact")!;
    assert.equal(root.parentId, null);
    assert.equal(nested.parentId, root.id);
    assert.equal(second.parentId, null);
    assert.equal(root.sortOrder, 0);
    assert.equal(second.sortOrder, 2);
    assert.match(root.id, /^[a-f0-9]{24}$/);
    assert.equal(events[0]!.eventType, "content.menu_items_saved");
    assert.equal(events[0]!.actorId, "user-1");
  });

  it("rejects when the menu does not exist", async () => {
    const { repo } = memoryMenus([]);
    const saveMenuItems = createSaveMenuItems(repo, { record: async () => {} });
    const result = await saveMenuItems("missing", [draft()]);
    assert.equal(result.ok, false);
  });
});

describe("saveMenu", () => {
  it("creates a menu and audits content.menu_created", async () => {
    const { repo } = memoryMenus([]);
    const { writer, events } = memoryAudit();
    const saveMenu = createSaveMenu(repo, writer);
    const result = await saveMenu({ name: "Main" }, "user-1");
    assert.equal(result.ok, true);
    assert.equal(events[0]!.eventType, "content.menu_created");
    assert.equal(events[0]!.entityId, result.ok ? result.value.id : undefined);
  });

  it("updates an existing menu and audits content.menu_updated", async () => {
    const { repo } = memoryMenus([menu("menu-1")]);
    const { writer, events } = memoryAudit();
    const saveMenu = createSaveMenu(repo, writer);
    const result = await saveMenu({ id: "menu-1", name: "Main", slug: "main" }, "user-1");
    assert.equal(result.ok, true);
    assert.equal(events[0]!.eventType, "content.menu_updated");
  });

  it("rejects a name that cannot produce a slug", async () => {
    const { repo } = memoryMenus([]);
    const saveMenu = createSaveMenu(repo, { record: async () => {} });
    const result = await saveMenu({ name: "" });
    assert.equal(result.ok, false);
  });
});

describe("deleteMenu", () => {
  it("deletes the menu and audits content.menu_deleted", async () => {
    const { repo, menus } = memoryMenus([menu("menu-1")]);
    const { writer, events } = memoryAudit();
    const deleteMenu = createDeleteMenu(repo, writer);
    await deleteMenu("menu-1", "user-1");
    assert.equal(menus.length, 0);
    assert.equal(events[0]!.eventType, "content.menu_deleted");
    assert.equal(events[0]!.entityId, "menu-1");
  });
});

describe("menus queries", () => {
  it("lists menus and their items", async () => {
    const item: MenuItem = {
      id: "item-1",
      menuId: "menu-1",
      parentId: null,
      label: "Home",
      type: "custom",
      refId: null,
      url: "/",
      sortOrder: 0,
    };
    const { repo } = memoryMenus([menu("menu-1")], [item]);
    assert.deepEqual(await createListMenus(repo)(), [menu("menu-1")]);
    assert.deepEqual(await createGetMenuItems(repo)("menu-1"), [item]);
  });
});