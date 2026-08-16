import { err, ok, type Result } from "@/shared/kernel/result";
import { slugify } from "@/shared/kernel/slug";
import { newObjectId } from "@/shared/db/object-id";
import type { AuditEventWriter } from "@/modules/audit/domain/types";
import type {
  Menu,
  MenuItem,
  MenuItemDraft,
  MenuReader,
  MenuWriter,
} from "../../domain/types";

function flattenItems(menuId: string, drafts: MenuItemDraft[], parentId: string | null): MenuItem[] {
  const flat: MenuItem[] = [];
  drafts.forEach((draft, index) => {
    const item: MenuItem = {
      id: newObjectId(),
      menuId,
      parentId,
      label: draft.label.trim(),
      type: draft.type,
      refId: draft.refId ?? null,
      url: draft.url ?? null,
      sortOrder: draft.sortOrder ?? index,
    };
    flat.push(item);
    if (draft.children.length > 0) {
      flat.push(...flattenItems(menuId, draft.children, item.id));
    }
  });
  return flat;
}

export function createListMenus(menus: MenuReader) {
  return async function listMenus(): Promise<Menu[]> {
    return menus.list();
  };
}

export function createSaveMenu(menus: MenuWriter & MenuReader, audit: AuditEventWriter) {
  return async function saveMenu(
    input: { id?: string; name: string; slug?: string },
    actorId?: string | null,
  ): Promise<Result<Menu>> {
    const slug = slugify(input.slug || input.name);
    if (!slug) return err("A slug could not be generated.");
    if (input.id) {
      const menu = await menus.update(input.id, { name: input.name.trim(), slug });
      await audit.record({
        actorId: actorId ?? null,
        eventType: "content.menu_updated",
        entityType: "menu",
        entityId: menu.id,
        details: JSON.stringify({ name: menu.name }),
      });
      return ok(menu);
    }
    const menu = await menus.create({ id: newObjectId(), name: input.name.trim(), slug });
    await audit.record({
      actorId: actorId ?? null,
      eventType: "content.menu_created",
      entityType: "menu",
      entityId: menu.id,
      details: JSON.stringify({ name: menu.name }),
    });
    return ok(menu);
  };
}

export function createDeleteMenu(menus: MenuReader & MenuWriter, audit: AuditEventWriter) {
  return async function deleteMenu(id: string, actorId?: string | null): Promise<void> {
    const menu = await menus.findById(id);
    await menus.delete(id);
    await audit.record({
      actorId: actorId ?? null,
      eventType: "content.menu_deleted",
      entityType: "menu",
      entityId: id,
      details: menu ? JSON.stringify({ name: menu.name }) : null,
    });
  };
}

export function createGetMenuItems(menus: MenuReader) {
  return async function getMenuItems(menuId: string): Promise<MenuItem[]> {
    return menus.listItems(menuId);
  };
}

export function createSaveMenuItems(menus: MenuReader & MenuWriter, audit: AuditEventWriter) {
  return async function saveMenuItems(
    menuId: string,
    items: MenuItemDraft[],
    actorId?: string | null,
  ): Promise<Result<{ ok: true }>> {
    const menu = await menus.findById(menuId);
    if (!menu) return err("Menu not found.");
    await menus.replaceItems(menuId, flattenItems(menuId, items, null));
    await audit.record({
      actorId: actorId ?? null,
      eventType: "content.menu_items_saved",
      entityType: "menu",
      entityId: menuId,
      details: JSON.stringify({ name: menu.name, itemCount: items.length }),
    });
    return ok({ ok: true });
  };
}
