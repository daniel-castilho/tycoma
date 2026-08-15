import { notFound } from "next/navigation";
import Link from "next/link";
import { getPage, listPages } from "@/modules/content/application";
import { deletePageAction, savePageAction } from "@/app/admin/_actions/content";
import { PageForm } from "../_components/page-form";

export default async function EditPagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [page, allPages] = await Promise.all([getPage(id), listPages()]);
  if (!page) notFound();

  return (
    <>
      <h2>Edit page</h2>
      <p className="lead">
        <Link href="/admin/pages">← Back to pages</Link>
        {" · "}
        <Link href={`/admin/pages/${page.id}/preview`} target="_blank" rel="noreferrer">
          Open preview
        </Link>
      </p>
      <PageForm
        action={savePageAction}
        page={page}
        availableParents={allPages
          .filter((p) => p.id !== page.id)
          .map((p) => ({ id: p.id, title: p.title }))}
      />
      <form action={deletePageAction} style={{ marginTop: "2rem" }}>
        <input type="hidden" name="id" value={page.id} />
        <button type="submit" className="btn-danger">
          Delete this page
        </button>
      </form>
    </>
  );
}
