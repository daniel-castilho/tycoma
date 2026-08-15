import Link from "next/link";
import { content } from "@/app/_lib/modules";
import { DataTable } from "@/app/admin/(authed)/_components/data-table";
import { EmptyState } from "@/app/admin/(authed)/_components/empty-state";
import { StatusBadge } from "@/app/admin/(authed)/_components/status-badge";
import type { Page } from "@/modules/content/domain/types";

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(value);
}

function pageDepthPath(
  pages: Page[],
  id: string | null,
): string {
  if (!id) return "";
  const segments: string[] = [];
  let current = pages.find((p) => p.id === id);
  let guard = 0;
  while (current && guard < 32) {
    segments.unshift(current.title);
    current = current.parentId ? pages.find((p) => p.id === current!.parentId) : undefined;
    guard += 1;
  }
  return segments.join(" / ");
}

export default async function PagesListPage() {
  const pages = await content.listPages();

  return (
    <>
      <h2>Pages</h2>
      <p className="lead">Static pages with optional parent/child hierarchy.</p>

      <div className="admin-toolbar">
        <span style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
          {pages.length} page{pages.length === 1 ? "" : "s"}
        </span>
        <div className="actions">
          <Link href="/admin/pages/new" className="btn-primary">
            New page
          </Link>
        </div>
      </div>

      <DataTable<Page>
        rows={pages}
        rowKey={(p) => p.id}
        columns={[
          {
            header: "Title",
            cell: (p) => (
              <div>
                <Link href={`/admin/pages/${p.id}`}>{p.title}</Link>
                {p.parentId ? (
                  <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                    under {pageDepthPath(pages, p.parentId)}
                  </div>
                ) : null}
              </div>
            ),
          },
          { header: "Slug", cell: (p) => p.slug },
          { header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
          { header: "Updated", cell: (p) => formatDate(p.updatedAt) },
        ]}
        empty={
          <EmptyState
            title="No pages yet"
            description="Create your first static page to get started."
            action={
              <Link href="/admin/pages/new" className="btn-primary">
                New page
              </Link>
            }
          />
        }
      />
    </>
  );
}
