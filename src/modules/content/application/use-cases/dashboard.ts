import type { PageRepository, Post, PostRepository } from "../../domain/types";

export type DashboardKpis = {
  posts: Record<string, number>;
  pages: Record<string, number>;
  latestPosts: Post[];
};

export function createGetDashboardKpis(posts: PostRepository, pages: PageRepository) {
  return async function getDashboardKpis(): Promise<DashboardKpis> {
    const [postCounts, pageCounts, latestPosts] = await Promise.all([
      posts.countByStatus(),
      pages.countByStatus(),
      posts.latestUpdated(5),
    ]);
    return { posts: postCounts, pages: pageCounts, latestPosts };
  };
}
