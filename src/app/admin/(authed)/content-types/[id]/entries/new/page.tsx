import { notFound } from "next/navigation";
import Link from "next/link";
import { content } from "@/app/_lib/modules";
import { saveContentEntryAction } from "@/app/admin/_actions/content-types";
import { ContentEntryForm } from "../../../_components/content-entry-form";

export default async function NewEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const type = await content.getContentType(id);
  if (!type) notFound();

  return (
    <>
      <h2>New entry — {type.name}</h2>
      <p className="lead">
        <Link href={`/admin/content-types/${type.id}/entries`}>← Back to entries</Link>
      </p>
      <ContentEntryForm action={saveContentEntryAction} type={type} />
    </>
  );
}