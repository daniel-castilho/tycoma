import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { z } from "zod";
import { content } from "@/app/_lib/modules";
import { formatDate, resolveBaseUrl } from "../../_lib/format";

const paramsSchema = z.object({ type: z.string().min(1) });

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>;
}): Promise<Metadata> {
  const { type } = paramsSchema.parse(await params);
  const [contentType, settings] = await Promise.all([
    content.getContentTypeBySlug(type),
    content.getSettings(),
  ]);
  if (!contentType) return {};
  const title = contentType.description || contentType.name;
  return {
    title: contentType.name,
    description: title || undefined,
    alternates: { canonical: `${resolveBaseUrl(settings.baseUrl)}/types/${contentType.slug}` },
  };
}

export default async function ContentTypeIndexPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = paramsSchema.parse(await params);
  const [contentType, settings, entries] = await Promise.all([
    content.getContentTypeBySlug(type),
    content.getSettings(),
    content.listPublishedEntriesByTypeSlug(type),
  ]);
  if (!contentType || !entries) notFound();

  return (
    <>
      <h1>{contentType.name}</h1>
      {contentType.description ? <p className="site-lead">{contentType.description}</p> : null}

      {entries.length === 0 ? (
        <p className="site-empty">No published entries yet.</p>
      ) : (
        <ul className="site-post-list">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Link href={`/types/${contentType.slug}/${entry.slug}`} className="site-post-card">
                <h2>{entry.title}</h2>
                <time dateTime={entry.publishedAt?.toISOString() ?? undefined}>
                  {formatDate(entry.publishedAt, settings.timezone)}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
