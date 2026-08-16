import type { PageReader, Post, PostReader } from "../../domain/types";

const LATEST_POSTS_LIMIT = 5;

export type DashboardKpis = {
  posts: Record<string, number>;
  pages: Record<string, number>;
  latestPosts: Post[];
};

export function createGetDashboardKpis(posts: PostReader, pages: PageReader) {
  return async function getDashboardKpis(): Promise<DashboardKpis> {
    const [postCounts, pageCounts, latestPosts] = await Promise.all([
      posts.countByStatus(),
      pages.countByStatus(),
      posts.latestUpdated(LATEST_POSTS_LIMIT),
    ]);
    return { posts: postCounts, pages: pageCounts, latestPosts };
  };
}
