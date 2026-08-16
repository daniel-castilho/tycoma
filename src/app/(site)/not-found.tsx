import Link from "next/link";

export default function SiteNotFound() {
  return (
    <div className="site-404">
      <h1>404</h1>
      <p>This page could not be found.</p>
      <p>
        <Link href="/">Back to home</Link>
      </p>
    </div>
  );
}