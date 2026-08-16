import Link from "next/link";
import { content } from "@/app/_lib/modules";
import { deleteContentTypeAction } from "@/app/admin/_actions/content-types";
import { DataTable } from "@/app/admin/(authed)/_components/data-table";
import { EmptyState } from "@/app/admin/(authed)/_components/empty-state";
import type { ContentType } from "@/modules/content/domain/content-types";

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(value);
}

export default async function ContentTypesPage() {
  const types = await content.listContentTypes();

  return (
    <>
      <h2>Content types</h2>
      <p className="lead">
        Define custom content structures beyond posts and pages, then manage entries for each.
      </p>

      <form action={deleteContentTypeAction} style={{ display: "none" }} aria-hidden="true">
        <input name="id" />
      </form>

      <DataTable<ContentType>
        rows={types}
        rowKey={(t) => t.id}
        columns={[
          {
            header: "Name",
            cell: (t) => <Link href={`/admin/content-types/${t.id}`}>{t.name}</Link>,
          },
          { header: "Slug", cell: (t) => t.slug },
          { header: "Fields", cell: (t) => t.fields.length },
          {
            header: "Entries",
            cell: (t) => (
              <Link href={`/admin/content-types/${t.id}/entries`}>Manage entries</Link>
            ),
          },
          { header: "Updated", cell: (t) => formatDate(t.updatedAt) },
          {
            header: "",
            cell: (t) => (
              <form action={deleteContentTypeAction}>
                <input type="hidden" name="id" value={t.id} />
                <button type="submit" className="btn-danger btn-sm">
                  Delete
                </button>
              </form>
            ),
          },
        ]}
        empty={
          <EmptyState
            title="No content types yet"
            description="Create one to start managing custom entries."
            action={
              <Link href="/admin/content-types/new" className="btn-primary">
                New content type
              </Link>
            }
          />
        }
      />

      <p style={{ marginTop: "1rem" }}>
        <Link href="/admin/content-types/new" className="btn-primary">
          New content type
        </Link>
      </p>
    </>
  );
}