import { notFound } from "next/navigation";
import Link from "next/link";
import { content } from "@/app/_lib/modules";

export default async function PostPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await content.getPost(id);
  if (!post) notFound();

  return (
    <>
      <h2>Preview</h2>
      <p className="lead">
        <Link href={`/admin/posts/${post.id}`}>← Back to edit</Link>
        {" · "}
        <span style={{ color: "var(--muted)" }}>Status: {post.status} (not published)</span>
      </p>
      <article
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "0.5rem",
          padding: "1.5rem",
        }}
      >
        <h1 style={{ margin: "0 0 0.5rem" }}>{post.title}</h1>
        <p style={{ color: "var(--muted)", margin: "0 0 1.25rem" }}>{post.slug}</p>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            fontFamily: "inherit",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          {post.body}
        </pre>
      </article>
    </>
  );
}
