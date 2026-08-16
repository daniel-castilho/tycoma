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
  const [category, settings] = await Promise.all([content.getCategoryBySlug(slug), content.getSettings()]);
  if (!category) return {};
  return {
    title: category.name,
    description: category.description || undefined,
    alternates: { canonical: `${resolveBaseUrl(settings.baseUrl)}/categories/${category.slug}` },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = paramsSchema.parse(await params);
  const [category, settings] = await Promise.all([content.getCategoryBySlug(slug), content.getSettings()]);
  if (!category) notFound();

  const posts = await content.listPublishedPostsByCategory(category.id);

  return (
    <>
      <h1>{category.name}</h1>
      {category.description ? <p className="site-lead">{category.description}</p> : null}

      {posts.length === 0 ? (
        <p className="site-empty">No published posts in this category.</p>
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