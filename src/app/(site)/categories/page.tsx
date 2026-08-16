import Link from "next/link";
import { content } from "@/app/_lib/modules";

export default async function CategoriesPage() {
  const categories = await content.listCategories();

  return (
    <>
      <h1>Categories</h1>
      <p className="site-lead">Browse posts by category.</p>
      {categories.length === 0 ? (
        <p className="site-empty">No categories yet.</p>
      ) : (
        <ul className="site-taxonomy-list">
          {categories.map((category) => (
            <li key={category.id}>
              <Link href={`/categories/${category.slug}`}>
                <span>{category.name}</span>
                <span>
                  {category.postCount} post{category.postCount === 1 ? "" : "s"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}