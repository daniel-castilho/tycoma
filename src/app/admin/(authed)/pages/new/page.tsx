import Link from "next/link";
import { content } from "@/app/_lib/modules";
import { savePageAction } from "@/app/admin/_actions/content";
import { PageForm } from "../_components/page-form";

export default async function NewPagePage() {
  const pages = await content.listPages();

  return (
    <>
      <h2>New page</h2>
      <p className="lead">
        <Link href="/admin/pages">← Back to pages</Link>
      </p>
      <PageForm
        action={savePageAction}
        availableParents={pages.map((p) => ({ id: p.id, title: p.title }))}
      />
    </>
  );
}
