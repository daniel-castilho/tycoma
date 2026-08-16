import Link from "next/link";
import type { Post } from "@/modules/content/domain/types";
import { excerpt, formatDate } from "../_lib/format";

export function PostCard({ post, timezone }: { post: Post; timezone: string }) {
  return (
    <li>
      <Link href={`/posts/${post.slug}`} className="site-post-card">
        <h2>{post.title}</h2>
        <time dateTime={post.publishedAt?.toISOString() ?? undefined}>
          {formatDate(post.publishedAt, timezone)}
        </time>
        {post.body ? <p>{excerpt(post.body)}</p> : null}
      </Link>
    </li>
  );
}

export function PostList({ posts, timezone }: { posts: Post[]; timezone: string }) {
  return (
    <ul className="site-post-list">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} timezone={timezone} />
      ))}
    </ul>
  );
}