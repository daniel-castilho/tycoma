import { notFound } from "next/navigation";
import Link from "next/link";
import { content } from "@/app/_lib/modules";
import { savePostAction } from "@/app/admin/_actions/content";
import { PostForm } from "../_components/post-form";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await content.getPost(id);
  if (!post) notFound();

  return (
    <>
      <h2>Edit post</h2>
      <p className="lead">
        <Link href="/admin/posts">← Back to posts</Link>
        {" · "}
        <Link href={`/admin/posts/${post.id}/preview`} target="_blank" rel="noreferrer">
          Open preview
        </Link>
      </p>
      <PostForm action={savePostAction} post={post} />
    </>
  );
}
