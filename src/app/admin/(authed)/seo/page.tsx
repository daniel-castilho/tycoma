import Link from "next/link";
import { content } from "@/app/_lib/modules";
import { regenerateSitemapAction } from "@/app/admin/_actions/seo";
import { SeoDefaultsForm } from "./_components/seo-defaults-form";

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

export default async function SeoPage() {
  const settings = await content.getSettings();
  const baseUrl = settings.baseUrl || "http://localhost:3000";
  const generatedAt = formatDate(settings.sitemapGeneratedAt);

  return (
    <>
      <h2>SEO</h2>
      <p className="lead">Search engine defaults and the XML sitemap.</p>

      <SeoDefaultsForm
        baseUrl={baseUrl}
        initialTitle={settings.defaultMetaTitle}
        initialDescription={settings.defaultMetaDescription}
      />

      <section style={{ marginTop: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem" }}>XML sitemap</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
          Last generated: {generatedAt ?? "never"}
        </p>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <form action={regenerateSitemapAction}>
            <button type="submit" className="btn-secondary">
              Regenerate now
            </button>
          </form>
          <Link className="btn-secondary" href="/sitemap.xml" target="_blank" rel="noreferrer">
            View /sitemap.xml
          </Link>
        </div>
      </section>
    </>
  );
}