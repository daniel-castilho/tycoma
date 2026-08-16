import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { z } from "zod";
import { content } from "@/app/_lib/modules";
import { formatDate, resolveBaseUrl } from "../../_lib/format";

const paramsSchema = z.object({ slug: z.string().min(1) });

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = paramsSchema.parse(await params);
  const [tag, settings] = await Promise.all([content.getTagBySlug(slug), content.getSettings()]);
  if (!tag) return {};
  return {
    title: tag.name,
    description: tag.description || undefined,
    alternates: { canonical: `${resolveBaseUrl(settings.baseUrl)}/tags/${tag.slug}` },
  };
}

export default async function TagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = paramsSchema.parse(await params);
  const [tag, settings] = await Promise.all([content.getTagBySlug(slug), content.getSettings()]);
  if (!tag) notFound();

  const posts = await content.listPublishedPostsByTag(tag.id);

  return (
    <>
      <h1>{tag.name}</h1>
      {tag.description ? <p className="site-lead">{tag.description}</p> : null}

      {posts.length === 0 ? (
        <p className="site-empty">No published posts with this tag.</p>
      ) : (
        <ul className="site-post-list">
          {posts.map((post) => (
            <li key={post.id}>
              <Link href={`/posts/${post.slug}`} className="site-post-card">
                <h2>{post.title}</h2>
                <time dateTime={post.publishedAt?.toISOString() ?? undefined}>
                  {formatDate(post.publishedAt, settings.timezone)}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}