import Link from "next/link";
import { notFound } from "next/navigation";
import { content } from "@/app/_lib/modules";
import type { MenuItem, MenuItemDraft } from "@/modules/content/domain/types";
import { MenuItemsEditor } from "../_components/menu-items-editor";

function nestItems(items: MenuItem[]): MenuItemDraft[] {
  const byParent = new Map<string | null, MenuItem[]>();
  for (const item of items) {
    const list = byParent.get(item.parentId) ?? [];
    list.push(item);
    byParent.set(item.parentId, list);
  }
  const build = (parentId: string | null): MenuItemDraft[] => {
    const children = (byParent.get(parentId) ?? []).sort((a, b) => a.sortOrder - b.sortOrder);
    return children.map((item) => ({
      label: item.label,
      type: item.type,
      refId: item.refId,
      url: item.url,
      sortOrder: item.sortOrder,
      children: build(item.id),
    }));
  };
  return build(null);
}

export default async function MenuEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const menu = (await content.listMenus()).find((m) => m.id === id);
  if (!menu) notFound();

  const [items, posts, pages, categories] = await Promise.all([
    content.getMenuItems(id),
    content.listPosts(),
    content.listPages(),
    content.listCategories(),
  ]);

  return (
    <>
      <p className="lead">
        <Link href="/admin/menus">Menus</Link> / {menu.name}
      </p>
      <h2>Edit menu</h2>

      <MenuItemsEditor
        menuId={menu.id}
        items={nestItems(items)}
        posts={posts.map((p) => ({ id: p.id, title: p.title }))}
        pages={pages.map((p) => ({ id: p.id, title: p.title }))}
        categories={categories.map((c) => ({ id: c.id, title: c.name }))}
      />
    </>
  );
}