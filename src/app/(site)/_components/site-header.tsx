import Image from "next/image";
import Link from "next/link";
import { PublicNav } from "./public-nav";
import type { PublicNavLink } from "@/modules/content/application/use-cases/public";

export type SiteHeaderProps = {
  title: string;
  logoUrl: string | null;
  nav: PublicNavLink[];
};

export function SiteHeader({ title, logoUrl, nav }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-brand">
          {logoUrl ? (
            <Image src={logoUrl} alt={title} width={32} height={32} className="site-logo" />
          ) : null}
          <span>{title}</span>
        </Link>
        <PublicNav items={nav} />
      </div>
    </header>
  );
}