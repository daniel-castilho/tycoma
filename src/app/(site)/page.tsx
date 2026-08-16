import { content } from "@/app/_lib/modules";
import { PostList } from "./_components/post-card";

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
        <PostList posts={posts} timezone={settings.timezone} />
      )}
    </>
  );
}