import { notFound } from "next/navigation";
import Link from "next/link";
import { content } from "@/app/_lib/modules";
import { deleteContentEntryAction, saveContentEntryAction } from "@/app/admin/_actions/content-types";
import { ContentEntryForm } from "../../../_components/content-entry-form";

export default async function EditEntryPage({
  params,
}: {
  params: Promise<{ id: string; entryId: string }>;
}) {
  const { id, entryId } = await params;
  const [type, entry] = await Promise.all([content.getContentType(id), content.getEntry(entryId)]);
  if (!type || !entry || entry.contentTypeId !== id) notFound();

  return (
    <>
      <h2>Edit entry — {type.name}</h2>
      <p className="lead">
        <Link href={`/admin/content-types/${type.id}/entries`}>← Back to entries</Link>
      </p>
      <ContentEntryForm action={saveContentEntryAction} type={type} entry={entry} />
      <form action={deleteContentEntryAction} style={{ marginTop: "2rem" }}>
        <input type="hidden" name="id" value={entry.id} />
        <input type="hidden" name="contentTypeId" value={type.id} />
        <button type="submit" className="btn-danger">
          Delete this entry
        </button>
      </form>
    </>
  );
}