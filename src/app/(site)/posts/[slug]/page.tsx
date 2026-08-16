import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { z } from "zod";
import { content, media } from "@/app/_lib/modules";
import { formatDate, resolveBaseUrl } from "../../_lib/format";

const paramsSchema = z.object({ slug: z.string().min(1) });

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = paramsSchema.parse(await params);
  const [post, settings] = await Promise.all([content.getPublishedPostBySlug(slug), content.getSettings()]);
  if (!post) return {};
  const og = post.ogImageId ? await media.getMedia(post.ogImageId) : null;
  return {
    title: post.metaTitle || post.title,
    description: post.metaDescription || undefined,
    alternates: { canonical: `${resolveBaseUrl(settings.baseUrl)}/posts/${post.slug}` },
    openGraph: og
      ? { title: post.metaTitle || post.title, description: post.metaDescription || undefined, images: [og.url] }
      : undefined,
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = paramsSchema.parse(await params);
  const [post, settings] = await Promise.all([content.getPublishedPostBySlug(slug), content.getSettings()]);
  if (!post) notFound();

  const featured = post.featuredImageId ? await media.getMedia(post.featuredImageId) : null;
  const isImage = featured ? featured.mimeType.startsWith("image/") : false;

  return (
    <article className="site-article">
      <h1>{post.title}</h1>
      <p className="site-article-meta">
        Published {formatDate(post.publishedAt, settings.timezone)}
      </p>

      {featured && isImage ? (
        <div className="site-article-featured" style={{ position: "relative", width: "100%", height: "18rem" }}>
          <Image src={featured.url} alt={featured.alt ?? post.title} fill sizes="(max-width: 64rem) 100vw, 64rem" style={{ objectFit: "cover" }} />
        </div>
      ) : null}

      <pre className="site-article-body">{post.body}</pre>
    </article>
  );
}