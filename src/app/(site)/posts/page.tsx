import type { Metadata } from "next";
import { content } from "@/app/_lib/modules";
import { resolveBaseUrl } from "../_lib/format";
import { PostList } from "../_components/post-card";

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
        <PostList posts={posts} timezone={settings.timezone} />
      )}
    </>
  );
}