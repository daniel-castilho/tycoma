import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { z } from "zod";
import { content } from "@/app/_lib/modules";
import { formatDate, resolveBaseUrl } from "../../../_lib/format";
import { ContentEntryFields } from "../../_components/content-entry-view";

const paramsSchema = z.object({
  type: z.string().min(1),
  slug: z.string().min(1),
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string; slug: string }>;
}): Promise<Metadata> {
  const { type, slug } = paramsSchema.parse(await params);
  const [entry, contentType, settings] = await Promise.all([
    content.getPublishedEntryByTypeAndSlug(type, slug),
    content.getContentTypeBySlug(type),
    content.getSettings(),
  ]);
  if (!entry || !contentType) return {};
  const metaTitle = (entry.fields.metaTitle as string | undefined) || entry.title;
  const metaDescription =
    (entry.fields.metaDescription as string | undefined) || contentType.description || undefined;
  return {
    title: metaTitle,
    description: metaDescription,
    alternates: { canonical: `${resolveBaseUrl(settings.baseUrl)}/types/${contentType.slug}/${entry.slug}` },
  };
}

export default async function ContentEntryPage({
  params,
}: {
  params: Promise<{ type: string; slug: string }>;
}) {
  const { type, slug } = paramsSchema.parse(await params);
  const [entry, contentType, settings] = await Promise.all([
    content.getPublishedEntryByTypeAndSlug(type, slug),
    content.getContentTypeBySlug(type),
    content.getSettings(),
  ]);
  if (!entry || !contentType) notFound();

  return (
    <article className="site-article">
      <p className="site-article-meta">
        <a href={`/types/${contentType.slug}`}>{contentType.name}</a>
      </p>
      <h1>{entry.title}</h1>
      <p className="site-article-meta">
        Published {formatDate(entry.publishedAt, settings.timezone)}
      </p>
      <ContentEntryFields fields={entry.fields} contentType={contentType} timezone={settings.timezone} />
    </article>
  );
}
