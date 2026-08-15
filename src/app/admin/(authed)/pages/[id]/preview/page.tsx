import { notFound } from "next/navigation";
import Link from "next/link";
import { getPage } from "@/modules/content/application";

export default async function PagePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const page = await getPage(id);
  if (!page) notFound();

  return (
    <>
      <h2>Preview</h2>
      <p className="lead">
        <Link href={`/admin/pages/${page.id}`}>← Back to edit</Link>
        {" · "}
        <span style={{ color: "var(--muted)" }}>Status: {page.status} (not published)</span>
      </p>
      <article
        style={{
          background: "var(--surface)",
          border: 1,
          borderStyle: "solid",
          borderColor: "var(--border)",
          borderRadius: "0.5rem",
          padding: "1.5rem",
        }}
      >
        <h1 style={{ margin: "0 0 0.5rem" }}>{page.title}</h1>
        <p style={{ color: "var(--muted)", margin: "0 0 1.25rem" }}>{page.slug}</p>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            fontFamily: "inherit",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          {page.body}
        </pre>
      </article>
    </>
  );
}
