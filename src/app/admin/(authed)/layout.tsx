import "./_components/admin-shell.css";
import Link from "next/link";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/app/admin/_lib/session-cookie";
import { verifySessionToken } from "@/modules/auth/application/edge";
import { logoutAction } from "@/app/admin/_actions/auth";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/pages", label: "Pages" },
  { href: "/admin/taxonomy", label: "Categories & Tags" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/menus", label: "Menus" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/seo", label: "SEO" },
  { href: "/admin/account", label: "Account" },
  { href: "/admin/audit-log", label: "Audit log" },
];

export default async function AuthedLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <h1>TYCOMA</h1>
        <nav>
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <span className="who">Signed in as {session?.name ?? "admin"}</span>
          <form action={logoutAction}>
            <button type="submit">Sign out</button>
          </form>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
