"use client";

import { useState } from "react";
import type { MenuItemDraft, MenuItemType } from "@/modules/content/domain/types";
import { saveMenuItemsAction } from "@/app/admin/_actions/menus";

export type MenuTarget = { id: string; title: string };

type EditorItem = {
  key: string;
  type: MenuItemType;
  refId: string | null;
  url: string | null;
  label: string;
  children: EditorItem[];
};

function toEditorItem(item: MenuItemDraft, counter: { n: number }): EditorItem {
  return {
    key: `k${counter.n++}`,
    type: item.type,
    refId: item.refId,
    url: item.url,
    label: item.label,
    children: item.children.map((child) => toEditorItem(child, counter)),
  };
}

function toDraft(item: EditorItem, index: number): MenuItemDraft {
  return {
    label: item.label,
    type: item.type,
    refId: item.refId,
    url: item.url,
    sortOrder: index,
    children: item.children.map((child, childIndex) => toDraft(child, childIndex)),
  };
}

function newItem(type: MenuItemType = "custom"): EditorItem {
  return { key: crypto.randomUUID(), type, refId: null, url: null, label: "", children: [] };
}

export function MenuItemsEditor({
  menuId,
  items,
  posts,
  pages,
  categories,
}: {
  menuId: string;
  items: MenuItemDraft[];
  posts: MenuTarget[];
  pages: MenuTarget[];
  categories: MenuTarget[];
}) {
  const [tree, setTree] = useState<EditorItem[]>(() => {
    const counter = { n: 0 };
    return items.map((item) => toEditorItem(item, counter));
  });

  const targets: Record<MenuItemType, MenuTarget[]> = {
    post: posts,
    page: pages,
    category: categories,
    custom: [],
  };

  function patch(path: number[], patchFn: (item: EditorItem) => Partial<EditorItem>) {
    setTree((current) => {
      const next = structuredClone(current);
      const parent =
        path.length === 1 ? next : path.slice(0, -1).reduce<EditorItem[]>((acc, idx) => acc[idx]!.children, next);
      const idx = path[path.length - 1]!;
      parent[idx] = { ...parent[idx]!, ...patchFn(parent[idx]!) };
      return next;
    });
  }

  function addItem(path: number[]) {
    setTree((current) => {
      const next = structuredClone(current);
      const parent = path.reduce<EditorItem[]>((acc, idx) => acc[idx]!.children, next);
      parent.push(newItem());
      return next;
    });
  }

  function move(path: number[], dir: -1 | 1) {
    setTree((current) => {
      const next = structuredClone(current);
      const parent =
        path.length === 1 ? next : path.slice(0, -1).reduce<EditorItem[]>((acc, idx) => acc[idx]!.children, next);
      const idx = path[path.length - 1]!;
      const target = idx + dir;
      if (target < 0 || target >= parent.length) return current;
      const [item] = parent.splice(idx, 1);
      parent.splice(target, 0, item!);
      return next;
    });
  }

  function remove(path: number[]) {
    setTree((current) => {
      const next = structuredClone(current);
      const parent =
        path.length === 1 ? next : path.slice(0, -1).reduce<EditorItem[]>((acc, idx) => acc[idx]!.children, next);
      parent.splice(path[path.length - 1]!, 1);
      return next;
    });
  }

  const drafts = tree.map((item, index) => toDraft(item, index));

  function renderItem(item: EditorItem, path: number[]) {
    const parent =
      path.length === 1 ? tree : path.slice(0, -1).reduce<EditorItem[]>((acc, idx) => acc[idx]!.children, tree);
    const isLast = path[path.length - 1] === parent.length - 1;
    return (
      <div
        key={item.key}
        style={{
          marginLeft: `${(path.length - 1) * 1.25}rem`,
          border: "1px solid var(--border)",
          borderRadius: "0.4rem",
          padding: "0.6rem",
        }}
      >
        <div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "minmax(8rem, 1fr) auto auto auto" }}>
          <input
            className="btn-secondary"
            value={item.label}
            placeholder="Label"
            onChange={(e) => patch(path, () => ({ label: e.target.value }))}
          />
          <select
            className="btn-secondary"
            value={item.type}
            onChange={(e) => patch(path, () => ({ type: e.target.value as MenuItemType }))}
          >
            <option value="post">Post</option>
            <option value="page">Page</option>
            <option value="category">Category</option>
            <option value="custom">Custom URL</option>
          </select>
          {item.type === "custom" ? (
            <input
              className="btn-secondary"
              value={item.url ?? ""}
              placeholder="https://…"
              onChange={(e) => patch(path, () => ({ url: e.target.value || null }))}
            />
          ) : (
            <select
              className="btn-secondary"
              value={item.refId ?? ""}
              onChange={(e) => patch(path, () => ({ refId: e.target.value || null }))}
            >
              <option value="">— Choose —</option>
              {targets[item.type].map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          )}
          <div style={{ display: "flex", gap: "0.25rem" }}>
            <button type="button" className="btn-secondary" onClick={() => move(path, -1)} disabled={path[path.length - 1] === 0}>
              ↑
            </button>
            <button type="button" className="btn-secondary" onClick={() => move(path, 1)} disabled={isLast}>
              ↓
            </button>
            <button type="button" className="btn-secondary" onClick={() => addItem(path)} title="Add child item">
              + child
            </button>
            <button type="button" className="btn-danger" onClick={() => remove(path)}>
              ×
            </button>
          </div>
        </div>
        {item.children.length > 0 ? (
          <div style={{ display: "grid", gap: "0.5rem", marginTop: "0.5rem" }}>
            {item.children.map((child, childIndex) => renderItem(child, [...path, childIndex]))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form action={saveMenuItemsAction}>
      <input type="hidden" name="menuId" value={menuId} />
      <input type="hidden" name="items" value={JSON.stringify(drafts)} readOnly />
      <div style={{ display: "grid", gap: "0.5rem" }}>
        {tree.map((item, index) => renderItem(item, [index]))}
      </div>
      {tree.length === 0 ? <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>No items yet.</p> : null}
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
        <button type="button" className="btn-secondary" onClick={() => addItem([])}>
          + Add item
        </button>
        <button type="submit" className="btn-primary">
          Save menu items
        </button>
      </div>
    </form>
  );
}