import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { z } from "zod";
import { content, media } from "@/app/_lib/modules";
import { resolveBaseUrl } from "../_lib/format";

const paramsSchema = z.object({ slug: z.string().min(1) });

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = paramsSchema.parse(await params);
  const [page, settings] = await Promise.all([content.getPublishedPageBySlug(slug), content.getSettings()]);
  if (!page) return {};
  const og = page.ogImageId ? await media.getMedia(page.ogImageId) : null;
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || undefined,
    alternates: { canonical: `${resolveBaseUrl(settings.baseUrl)}/${page.slug}` },
    openGraph: og
      ? { title: page.metaTitle || page.title, description: page.metaDescription || undefined, images: [og.url] }
      : undefined,
  };
}

export default async function PageDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = paramsSchema.parse(await params);
  const page = await content.getPublishedPageBySlug(slug);
  if (!page) notFound();

  const featured = page.featuredImageId ? await media.getMedia(page.featuredImageId) : null;
  const isImage = featured ? featured.mimeType.startsWith("image/") : false;

  return (
    <article className="site-article">
      <h1>{page.title}</h1>
      {featured && isImage ? (
        <div className="site-article-featured" style={{ position: "relative", width: "100%", height: "18rem" }}>
          <Image src={featured.url} alt={featured.alt ?? page.title} fill sizes="(max-width: 64rem) 100vw, 64rem" style={{ objectFit: "cover" }} />
        </div>
      ) : null}
      <pre className="site-article-body">{page.body}</pre>
    </article>
  );
}