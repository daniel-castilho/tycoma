import { notFound } from "next/navigation";
import Link from "next/link";
import { content, media } from "@/app/_lib/modules";
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

  const mediaAssets = typeHasMediaField(type)
    ? await media.listMedia({ mimePrefix: "image" })
    : [];
  const pickerAssets = mediaAssets.map((asset) => ({
    id: asset.id,
    filename: asset.filename,
    url: asset.url,
    alt: asset.alt,
  }));

  return (
    <>
      <h2>New entry — {type.name}</h2>
      <p className="lead">
        <Link href={`/admin/content-types/${type.id}/entries`}>← Back to entries</Link>
      </p>
      <ContentEntryForm action={saveContentEntryAction} type={type} mediaAssets={pickerAssets} />
    </>
  );
}

function typeHasMediaField(type: { fields: { type: string }[] }): boolean {
  return type.fields.some((field) => field.type === "media");
}