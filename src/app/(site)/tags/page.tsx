import Link from "next/link";
import { content } from "@/app/_lib/modules";

export default async function TagsPage() {
  const tags = await content.listTags();

  return (
    <>
      <h1>Tags</h1>
      <p className="site-lead">Browse posts by tag.</p>
      {tags.length === 0 ? (
        <p className="site-empty">No tags yet.</p>
      ) : (
        <ul className="site-taxonomy-list">
          {tags.map((tag) => (
            <li key={tag.id}>
              <Link href={`/tags/${tag.slug}`}>
                <span>{tag.name}</span>
                <span>
                  {tag.postCount} post{tag.postCount === 1 ? "" : "s"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}