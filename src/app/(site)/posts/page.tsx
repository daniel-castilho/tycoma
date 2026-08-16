import type { Metadata } from "next";
import Link from "next/link";
import { content } from "@/app/_lib/modules";
import { excerpt, formatDate, resolveBaseUrl } from "../_lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await content.getSettings();
  const title = settings.defaultMetaTitle || `${settings.title || "Blog"} — all posts`;
  return {
    title,
    description: settings.defaultMetaDescription || undefined,
    alternates: { canonical: `${resolveBaseUrl(settings.baseUrl)}/posts` },
  };
}

export default async function PostsIndexPage() {
  const [settings, posts] = await Promise.all([content.getSettings(), content.listPublishedPosts()]);

  return (
    <>
      <h1>All posts</h1>
      <p className="site-lead">Every published post, newest first.</p>

      {posts.length === 0 ? (
        <p className="site-empty">No published posts yet.</p>
      ) : (
        <ul className="site-post-list">
          {posts.map((post) => (
            <li key={post.id}>
              <Link href={`/posts/${post.slug}`} className="site-post-card">
                <h2>{post.title}</h2>
                <time dateTime={post.publishedAt?.toISOString() ?? undefined}>
                  {formatDate(post.publishedAt, settings.timezone)}
                </time>
                {post.body ? <p>{excerpt(post.body)}</p> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}