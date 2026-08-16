import type { Metadata } from "next";
import { content, media } from "@/app/_lib/modules";
import { SiteFooter } from "./_components/site-footer";
import { SiteHeader } from "./_components/site-header";
import "./site.css";

// Public pages read live content through the content/media modules. Render them
// on demand (like the admin auth pages and /sitemap.xml) so `next build` does
// not need a running database or environment secrets.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await content.getSettings();
  const favicon = settings.faviconMediaId ? await media.getMedia(settings.faviconMediaId) : null;
  return {
    title: settings.title || "Tycoma",
    description: settings.description || undefined,
    icons: favicon ? { icon: favicon.url } : undefined,
  };
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, nav] = await Promise.all([content.getSettings(), content.getPublicNav()]);
  const logo = settings.logoMediaId ? await media.getMedia(settings.logoMediaId) : null;

  return (
    <div className="site-shell">
      <SiteHeader title={settings.title || "Tycoma"} logoUrl={logo?.url ?? null} nav={nav} />

      <main className="site-main">{children}</main>

      <SiteFooter title={settings.title || "Tycoma"} description={settings.description} />
    </div>
  );
}