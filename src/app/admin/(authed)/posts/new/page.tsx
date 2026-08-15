import Link from "next/link";
import { savePostAction } from "@/app/admin/_actions/content";
import { PostForm } from "../_components/post-form";

export default function NewPostPage() {
  return (
    <>
      <h2>New post</h2>
      <p className="lead">
        <Link href="/admin/posts">← Back to posts</Link>
      </p>
      <PostForm action={savePostAction} />
    </>
  );
}
