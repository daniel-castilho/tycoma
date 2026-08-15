import Link from "next/link";
import { listCategories, listTags } from "@/modules/content/application";
import {
  deleteCategoryAction,
  deleteTagAction,
  saveCategoryAction,
  saveTagAction,
} from "@/app/admin/_actions/content";
import { DataTable } from "@/app/admin/(authed)/_components/data-table";
import { EmptyState } from "@/app/admin/(authed)/_components/empty-state";
import type { Category, Tag } from "@/modules/content/domain/types";

type CategoryWithCount = Category & { postCount: number };
type TagWithCount = Tag & { postCount: number };

function pathFor(categories: Category[], id: string | null): string {
  if (!id) return "";
  const segments: string[] = [];
  let current = categories.find((c) => c.id === id);
  let guard = 0;
  while (current && guard < 32) {
    segments.unshift(current.name);
    current = current.parentId ? categories.find((c) => c.id === current!.parentId) : undefined;
    guard += 1;
  }
  return segments.join(" / ");
}

export default async function TaxonomyPage() {
  const [categories, tags] = await Promise.all([listCategories(), listTags()]);

  const categoryParents = categories.map((c) => ({ id: c.id, title: c.name }));

  return (
    <>
      <h2>Categories & Tags</h2>
      <p className="lead">Organize posts into categories and tags.</p>

      <div style={{ display: "grid", gap: "2rem", gridTemplateColumns: "repeat(auto-fit, minmax(28rem, 1fr))" }}>
        <section>
          <div className="admin-toolbar">
            <h2 style={{ margin: 0, fontSize: "1rem" }}>Categories</h2>
            <span style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
              {categories.length} total
            </span>
          </div>

          <DataTable<CategoryWithCount>
            rows={categories}
            rowKey={(c) => c.id}
            columns={[
              {
                header: "Name",
                cell: (c) => (
                  <div>
                    <div>{c.name}</div>
                    {c.parentId ? (
                      <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                        under {pathFor(categories, c.parentId)}
                      </div>
                    ) : null}
                  </div>
                ),
              },
              { header: "Slug", cell: (c) => c.slug },
              { header: "Posts", cell: (c) => c.postCount },
              {
                header: "",
                cell: (c) => (
                  <details>
                    <summary style={{ cursor: "pointer", color: "var(--accent)" }}>Edit</summary>
                    <div style={{ marginTop: "0.5rem", padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "0.4rem" }}>
                      <form action={saveCategoryAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <div className="form-stack" style={{ gap: "0.5rem" }}>
                          <input
                            className="btn-secondary"
                            name="name"
                            defaultValue={c.name}
                            placeholder="Name"
                            required
                          />
                          <input
                            className="btn-secondary"
                            name="slug"
                            defaultValue={c.slug}
                            placeholder="Slug"
                          />
                          <select
                            name="parentId"
                            defaultValue={c.parentId ?? ""}
                            className="btn-secondary"
                          >
                            <option value="">— No parent —</option>
                            {categoryParents
                              .filter((p) => p.id !== c.id)
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.title}
                                </option>
                              ))}
                          </select>
                          <button type="submit" className="btn-primary">
                            Save
                          </button>
                        </div>
                      </form>
                      <form action={deleteCategoryAction} style={{ marginTop: "0.5rem" }}>
                        <input type="hidden" name="id" value={c.id} />
                        <button type="submit" className="btn-danger">
                          Delete
                        </button>
                      </form>
                    </div>
                  </details>
                ),
              },
            ]}
            empty={
              <EmptyState
                title="No categories yet"
                description="Create one with the form below."
              />
            }
          />

          <details style={{ marginTop: "1rem" }}>
            <summary style={{ cursor: "pointer", color: "var(--accent)" }}>
              + New category
            </summary>
            <form
              action={saveCategoryAction}
              style={{ marginTop: "0.5rem", padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "0.4rem" }}
            >
              <div className="form-stack" style={{ gap: "0.5rem" }}>
                <input className="btn-secondary" name="name" placeholder="Name" required />
                <input className="btn-secondary" name="slug" placeholder="Slug (optional)" />
                <select name="parentId" defaultValue="" className="btn-secondary">
                  <option value="">— No parent —</option>
                  {categoryParents.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn-primary">
                  Create category
                </button>
              </div>
            </form>
          </details>
        </section>

        <section>
          <div className="admin-toolbar">
            <h2 style={{ margin: 0, fontSize: "1rem" }}>Tags</h2>
            <span style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
              {tags.length} total
            </span>
          </div>

          <DataTable<TagWithCount>
            rows={tags}
            rowKey={(t) => t.id}
            columns={[
              { header: "Name", cell: (t) => t.name },
              { header: "Slug", cell: (t) => t.slug },
              { header: "Posts", cell: (t) => t.postCount },
              {
                header: "",
                cell: (t) => (
                  <details>
                    <summary style={{ cursor: "pointer", color: "var(--accent)" }}>Edit</summary>
                    <div style={{ marginTop: "0.5rem", padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "0.4rem" }}>
                      <form action={saveTagAction}>
                        <input type="hidden" name="id" value={t.id} />
                        <div className="form-stack" style={{ gap: "0.5rem" }}>
                          <input className="btn-secondary" name="name" defaultValue={t.name} required />
                          <input className="btn-secondary" name="slug" defaultValue={t.slug} />
                          <button type="submit" className="btn-primary">
                            Save
                          </button>
                        </div>
                      </form>
                      <form action={deleteTagAction} style={{ marginTop: "0.5rem" }}>
                        <input type="hidden" name="id" value={t.id} />
                        <button type="submit" className="btn-danger">
                          Delete
                        </button>
                      </form>
                    </div>
                  </details>
                ),
              },
            ]}
            empty={
              <EmptyState
                title="No tags yet"
                description="Create one with the form below."
              />
            }
          />

          <details style={{ marginTop: "1rem" }}>
            <summary style={{ cursor: "pointer", color: "var(--accent)" }}>
              + New tag
            </summary>
            <form
              action={saveTagAction}
              style={{ marginTop: "0.5rem", padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "0.4rem" }}
            >
              <div className="form-stack" style={{ gap: "0.5rem" }}>
                <input className="btn-secondary" name="name" placeholder="Name" required />
                <input className="btn-secondary" name="slug" placeholder="Slug (optional)" />
                <button type="submit" className="btn-primary">
                  Create tag
                </button>
              </div>
            </form>
          </details>
        </section>
      </div>
    </>
  );
}
