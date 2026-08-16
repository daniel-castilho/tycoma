import Link from "next/link";
import type { PublicNavLink } from "@/modules/content/application/use-cases/public";

function NavList({ items, root }: { items: PublicNavLink[]; root?: boolean }) {
  return (
    <ul className={root ? "site-nav" : "site-nav-sub"}>
      {items.map((item) => (
        <li key={item.id}>
          <Link href={item.href ?? "#"}>{item.label}</Link>
          {item.children.length > 0 ? <NavList items={item.children} /> : null}
        </li>
      ))}
    </ul>
  );
}

export function PublicNav({ items }: { items: PublicNavLink[] }) {
  return <nav className="site-nav-wrap"><NavList items={items} root /></nav>;
}