import Link from "next/link";

export default function HomePage() {
  return (
    <main className="site-home">
      <p>Tycoma</p>
      <Link href="/admin">Admin</Link>
    </main>
  );
}
