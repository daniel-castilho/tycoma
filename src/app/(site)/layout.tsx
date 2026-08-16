import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { content, media } from "@/app/_lib/modules";
import { PublicNav } from "./_components/public-nav";
import "./site.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await content.getSettings();
  return {
    title: settings.title || "Tycoma",
    description: settings.description || undefined,
  };
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, nav] = await Promise.all([content.getSettings(), content.getPublicNav()]);
  const logo = settings.logoMediaId ? await media.getMedia(settings.logoMediaId) : null;

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <Link href="/" className="site-brand">
            {logo ? (
              <Image src={logo.url} alt={settings.title} width={32} height={32} className="site-logo" />
            ) : null}
            <span>{settings.title || "Tycoma"}</span>
          </Link>
          <PublicNav items={nav} />
        </div>
      </header>

      <main className="site-main">{children}</main>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <span>© {new Date().getFullYear()} {settings.title || "Tycoma"}</span>
          {settings.description ? <p>{settings.description}</p> : null}
        </div>
      </footer>
    </div>
  );
}