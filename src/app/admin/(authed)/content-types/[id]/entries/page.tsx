import { notFound } from "next/navigation";
import Link from "next/link";
import { content } from "@/app/_lib/modules";
import { deleteContentEntryAction, publishContentEntryAction } from "@/app/admin/_actions/content-types";
import { DataTable } from "@/app/admin/(authed)/_components/data-table";
import { EmptyState } from "@/app/admin/(authed)/_components/empty-state";
import { StatusBadge } from "@/app/admin/(authed)/_components/status-badge";
import type { ContentEntry } from "@/modules/content/domain/content-types";

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(value);
}

export default async function EntriesListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [type, entries] = await Promise.all([content.getContentType(id), content.listEntries({ contentTypeId: id })]);
  if (!type) notFound();

  return (
    <>
      <h2>Entries — {type.name}</h2>
      <p className="lead">
        <Link href={`/admin/content-types/${type.id}`}>← Edit this content type</Link>
        {" · "}
        <Link href="/admin/content-types">All content types</Link>
      </p>

      <form action={publishContentEntryAction} style={{ display: "none" }} aria-hidden="true">
        <input name="id" />
        <input name="contentTypeId" />
      </form>

      <DataTable<ContentEntry>
        rows={entries}
        rowKey={(e) => e.id}
        columns={[
          {
            header: "Title",
            cell: (e) => <Link href={`/admin/content-types/${type.id}/entries/${e.id}`}>{e.title}</Link>,
          },
          { header: "Slug", cell: (e) => e.slug },
          { header: "Status", cell: (e) => <StatusBadge status={e.status} /> },
          { header: "Updated", cell: (e) => formatDate(e.updatedAt) },
          {
            header: "",
            cell: (e) => (
              <div className="row-actions">
                <form action={publishContentEntryAction}>
                  <input type="hidden" name="id" value={e.id} />
                  <input type="hidden" name="contentTypeId" value={type.id} />
                  <button type="submit" className="btn-secondary btn-sm" disabled={e.status === "published"}>
                    Publish
                  </button>
                </form>
                <form action={deleteContentEntryAction}>
                  <input type="hidden" name="id" value={e.id} />
                  <input type="hidden" name="contentTypeId" value={type.id} />
                  <button type="submit" className="btn-danger btn-sm">
                    Delete
                  </button>
                </form>
              </div>
            ),
          },
        ]}
        empty={
          <EmptyState
            title="No entries yet"
            description="Create the first entry for this content type."
            action={
              <Link href={`/admin/content-types/${type.id}/entries/new`} className="btn-primary">
                New entry
              </Link>
            }
          />
        }
      />

      <p style={{ marginTop: "1rem" }}>
        <Link href={`/admin/content-types/${type.id}/entries/new`} className="btn-primary">
          New entry
        </Link>
      </p>
    </>
  );
}