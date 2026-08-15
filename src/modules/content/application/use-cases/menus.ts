import { randomUUID } from "node:crypto";
import { err, ok, type Result } from "@/shared/kernel/result";
import { slugify } from "@/shared/kernel/slug";
import type { Menu, MenuItem, MenuRepository } from "../../domain/types";

const oid = () => randomUUID().replace(/-/g, "").slice(0, 24);

export function createListMenus(menus: MenuRepository) {
  return async function listMenus(): Promise<Menu[]> {
    return menus.list();
  };
}

export function createSaveMenu(menus: MenuRepository) {
  return async function saveMenu(input: {
    id?: string;
    name: string;
    slug?: string;
  }): Promise<Result<Menu>> {
    const slug = slugify(input.slug || input.name);
    if (!slug) return err("A slug could not be generated.");
    if (input.id) {
      return ok(await menus.update(input.id, { name: input.name.trim(), slug }));
    }
    return ok(await menus.create({ id: oid(), name: input.name.trim(), slug }));
  };
}

export function createDeleteMenu(menus: MenuRepository) {
  return async function deleteMenu(id: string): Promise<void> {
    await menus.delete(id);
  };
}

export function createGetMenuItems(menus: MenuRepository) {
  return async function getMenuItems(menuId: string): Promise<MenuItem[]> {
    return menus.listItems(menuId);
  };
}

export function createSaveMenuItems(menus: MenuRepository) {
  return async function saveMenuItems(
    menuId: string,
    items: Omit<MenuItem, "id" | "menuId">[],
  ): Promise<Result<{ ok: true }>> {
    const menu = await menus.findById(menuId);
    if (!menu) return err("Menu not found.");
    await menus.replaceItems(
      menuId,
      items.map((item, index) => ({
        ...item,
        id: oid(),
        menuId,
        sortOrder: item.sortOrder ?? index,
      })),
    );
    return ok({ ok: true });
  };
}
