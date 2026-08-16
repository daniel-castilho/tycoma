import { notFound } from "next/navigation";
import Link from "next/link";
import { content } from "@/app/_lib/modules";
import { deleteContentTypeAction, saveContentTypeAction } from "@/app/admin/_actions/content-types";
import { ContentTypeForm } from "../_components/content-type-form";

export default async function EditContentTypePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const type = await content.getContentType(id);
  if (!type) notFound();

  return (
    <>
      <h2>Edit content type</h2>
      <p className="lead">
        <Link href="/admin/content-types">← Back to content types</Link>
        {" · "}
        <Link href={`/admin/content-types/${type.id}/entries`}>Manage entries</Link>
      </p>
      <ContentTypeForm action={saveContentTypeAction} type={type} />
      <form action={deleteContentTypeAction} style={{ marginTop: "2rem" }}>
        <input type="hidden" name="id" value={type.id} />
        <button type="submit" className="btn-danger">
          Delete this content type
        </button>
      </form>
    </>
  );
}