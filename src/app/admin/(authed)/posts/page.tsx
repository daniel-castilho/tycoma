import Link from "next/link";
import { content } from "@/app/_lib/modules";
import { bulkPostsAction } from "@/app/admin/_actions/content";
import { DataTable } from "@/app/admin/(authed)/_components/data-table";
import { EmptyState } from "@/app/admin/(authed)/_components/empty-state";
import { StatusBadge } from "@/app/admin/(authed)/_components/status-badge";
import type { ContentStatus, Post } from "@/modules/content/domain/types";

const STATUSES: ContentStatus[] = ["draft", "scheduled", "published"];

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(value);
}

function isStatus(value: string | undefined): value is ContentStatus {
  return value === "draft" || value === "scheduled" || value === "published";
}

export default async function PostsListPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    category?: string;
    sort?: string;
    order?: string;
  }>;
}) {
  const sp = await searchParams;
  const status = isStatus(sp.status) ? sp.status : undefined;
  const search = sp.q?.trim() || undefined;
  const categoryId = sp.category?.trim() || undefined;
  const sort = sp.sort === "title" || sp.sort === "publishedAt" ? sp.sort : "updatedAt";
  const order = sp.order === "asc" ? "asc" : "desc";

  const [posts, categories] = await Promise.all([
    content.listPosts({ status, search, categoryId, sort, order }),
    content.listCategories(),
  ]);

  const categoryName = categoryId
    ? categories.find((c) => c.id === categoryId)?.name ?? ""
    : "";

  return (
    <>
      <h2>Posts</h2>
      <p className="lead">Write, schedule, and publish blog posts.</p>

      <form className="admin-toolbar" method="get">
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <select name="status" defaultValue={status ?? ""} className="btn-secondary">
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select name="category" defaultValue={categoryId ?? ""} className="btn-secondary">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="search"
            name="q"
            defaultValue={search ?? ""}
            placeholder="Search titles…"
            className="btn-secondary"
            style={{ minWidth: "12rem" }}
          />
          <select name="sort" defaultValue={sort} className="btn-secondary">
            <option value="updatedAt">Updated</option>
            <option value="publishedAt">Published</option>
            <option value="title">Title</option>
          </select>
          <select name="order" defaultValue={order} className="btn-secondary">
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
          <button type="submit" className="btn-secondary">
            Apply
          </button>
        </div>
        <div className="actions">
          <Link href="/admin/posts/new" className="btn-primary">
            New post
          </Link>
        </div>
      </form>

      {categoryName ? (
        <p className="lead" style={{ marginBottom: "0.75rem" }}>
          Filtered by category: <strong>{categoryName}</strong>
        </p>
      ) : null}

      <form action={bulkPostsAction}>
        <div style={{ marginBottom: "0.5rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Bulk:</span>
          <button
            type="submit"
            name="action"
            value="delete"
            className="btn-secondary"
          >
            Delete selected
          </button>
          <button
            type="submit"
            name="action"
            value="publish"
            className="btn-secondary"
          >
            Publish selected
          </button>
        </div>
        <DataTable<Post>
          rows={posts}
          rowKey={(p) => p.id}
          columns={[
            {
              header: "",
              width: "2.5rem",
              cell: (p) => (
                <input type="checkbox" name="ids" value={p.id} aria-label={`Select ${p.title}`} />
              ),
            },
            {
              header: "Title",
              cell: (p) => <Link href={`/admin/posts/${p.id}`}>{p.title}</Link>,
            },
            { header: "Slug", cell: (p) => p.slug },
            { header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
            { header: "Updated", cell: (p) => formatDate(p.updatedAt) },
            {
              header: "",
              cell: (p) => (
                <div className="row-actions">
                  <Link href={`/admin/posts/${p.id}/preview`} className="btn-secondary">
                    Preview
                  </Link>
                </div>
              ),
            },
          ]}
          empty={
            <EmptyState
              title="No posts match these filters"
              description="Try clearing the filters or creating a new post."
              action={
                <Link href="/admin/posts/new" className="btn-primary">
                  New post
                </Link>
              }
            />
          }
        />
      </form>
    </>
  );
}
