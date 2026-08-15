import Link from "next/link";
import { listPages } from "@/modules/content/application";
import { savePageAction } from "@/app/admin/_actions/content";
import { PageForm } from "../_components/page-form";

export default async function NewPagePage() {
  const pages = await listPages();

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
