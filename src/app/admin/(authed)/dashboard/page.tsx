import Link from "next/link";
import { content, media } from "@/app/_lib/modules";

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DashboardPage() {
  const [kpis, stats] = await Promise.all([content.getDashboardKpis(), media.getMediaStorageStats()]);

  const postTotal = Object.values(kpis.posts).reduce((sum, n) => sum + n, 0);
  const pageTotal = Object.values(kpis.pages).reduce((sum, n) => sum + n, 0);

  return (
    <>
      <h2>Dashboard</h2>
      <p className="lead">A quick look at what is in the CMS right now.</p>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="label">Posts (total)</div>
          <div className="value">{postTotal}</div>
        </div>
        <div className="kpi-card">
          <div className="label">Posts · Published</div>
          <div className="value">{kpis.posts.published ?? 0}</div>
        </div>
        <div className="kpi-card">
          <div className="label">Posts · Drafts</div>
          <div className="value">{kpis.posts.draft ?? 0}</div>
        </div>
        <div className="kpi-card">
          <div className="label">Posts · Scheduled</div>
          <div className="value">{kpis.posts.scheduled ?? 0}</div>
        </div>
        <div className="kpi-card">
          <div className="label">Pages (total)</div>
          <div className="value">{pageTotal}</div>
        </div>
        <div className="kpi-card">
          <div className="label">Pages · Published</div>
          <div className="value">{kpis.pages.published ?? 0}</div>
        </div>
        <div className="kpi-card">
          <div className="label">Media files</div>
          <div className="value">{stats.count}</div>
        </div>
        <div className="kpi-card">
          <div className="label">Media · Storage</div>
          <div className="value">{formatBytes(stats.totalBytes)}</div>
        </div>
      </div>

      <h2 style={{ marginTop: "1.5rem" }}>Recently updated posts</h2>
      {kpis.latestPosts.length === 0 ? (
        <div className="empty-state">
          <p style={{ margin: 0, fontWeight: 600 }}>No posts yet</p>
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.875rem" }}>
            Once you create one, it will show up here.
          </p>
          <div style={{ marginTop: "0.85rem" }}>
            <Link href="/admin/posts/new" className="btn-primary">
              Create your first post
            </Link>
          </div>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {kpis.latestPosts.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/admin/posts/${p.id}`}>{p.title}</Link>
                </td>
                <td>{p.slug}</td>
                <td>{p.status}</td>
                <td>{formatDate(p.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
