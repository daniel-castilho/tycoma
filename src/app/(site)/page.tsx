import { formatDate, excerpt } from "./_lib/format";
import Link from "next/link";
import { content } from "@/app/_lib/modules";

export default async function HomePage() {
  const [settings, posts] = await Promise.all([content.getSettings(), content.listPublishedPosts()]);

  return (
    <>
      <h1>{settings.title || "Latest posts"}</h1>
      <p className="site-lead">
        {settings.description || "Fresh content from our blog."}
      </p>

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