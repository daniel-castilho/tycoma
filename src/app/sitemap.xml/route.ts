import { content } from "@/app/_lib/modules";

export const dynamic = "force-dynamic";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function urlEntry(loc: string, lastmod?: Date | null): string {
  const lastmodTag = lastmod ? `<lastmod>${lastmod.toISOString()}</lastmod>` : "";
  return `<url><loc>${escapeXml(loc)}</loc>${lastmodTag}</url>`;
}

export async function GET() {
  const [settings, posts, pages] = await Promise.all([content.getSettings(), content.listPosts(), content.listPages()]);
  const base = (settings.baseUrl || "http://localhost:3000").replace(/\/$/, "");

  const urls = [
    urlEntry(`${base}/`),
    ...posts
      .filter((p) => p.status === "published")
      .map((p) => urlEntry(`${base}/posts/${p.slug}`, p.updatedAt)),
    ...pages
      .filter((p) => p.status === "published")
      .map((p) => urlEntry(`${base}/${p.slug}`, p.updatedAt)),
  ];

  await content.touchSitemap();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`;
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}