import { audit } from "@/app/_lib/modules";

const EVENT_LABELS: Record<string, string> = {
  "auth.login": "Sign in",
  "auth.login_failed": "Failed sign in",
  "auth.login_blocked": "Sign in blocked (rate limit)",
  "auth.setup": "Initial setup",
  "auth.password_reset_requested": "Password reset requested",
  "auth.password_reset_completed": "Password reset completed",
  "auth.password_changed": "Password changed",
  "content.post_created": "Post created",
  "content.post_updated": "Post updated",
  "content.post_published": "Post published",
  "content.post_deleted": "Post deleted",
  "content.page_deleted": "Page deleted",
  "content.category_deleted": "Category deleted",
  "content.tag_deleted": "Tag deleted",
  "content.settings_updated": "Settings updated",
  "content.sitemap_regenerated": "Sitemap regenerated",
  "content.menu_created": "Menu created",
  "content.menu_updated": "Menu updated",
  "content.menu_deleted": "Menu deleted",
  "content.menu_items_saved": "Menu items saved",
  "media.uploaded": "File uploaded",
  "media.deleted": "File deleted",
};

function eventLabel(eventType: string): string {
  return EVENT_LABELS[eventType] ?? eventType;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "medium" }).format(value);
}

function actorLabel(actorId: string | null): string {
  return actorId ? `${actorId.slice(0, 6)}…` : "System";
}

function detailsSummary(details: string | null): string {
  if (!details) return "—";
  try {
    const parsed = JSON.parse(details) as Record<string, unknown>;
    return Object.entries(parsed)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(", ");
  } catch {
    return details;
  }
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ eventType?: string; entityType?: string; search?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const events = await audit.listAuditEvents({
    eventType: params.eventType || undefined,
    entityType: params.entityType || undefined,
    search: params.search || undefined,
    from: params.from || undefined,
    to: params.to || undefined,
  });

  const knownEventTypes = Object.keys(EVENT_LABELS);

  return (
    <>
      <h2>Audit log</h2>
      <p className="lead">A read-only trail of actions performed in the CMS.</p>

      <form method="get" className="admin-toolbar" style={{ flexWrap: "wrap" }}>
        <input className="btn-secondary" type="search" name="search" defaultValue={params.search} placeholder="Search details…" />
        <select className="btn-secondary" name="eventType" defaultValue={params.eventType ?? ""}>
          <option value="">All events</option>
          {knownEventTypes.map((t) => (
            <option key={t} value={t}>
              {EVENT_LABELS[t]}
            </option>
          ))}
        </select>
        <input className="btn-secondary" type="date" name="from" defaultValue={params.from} />
        <input className="btn-secondary" type="date" name="to" defaultValue={params.to} />
        <button type="submit" className="btn-secondary">
          Filter
        </button>
      </form>

      {events.length === 0 ? (
        <div className="empty-state">
          <p style={{ margin: 0, fontWeight: 600 }}>No events found</p>
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.875rem" }}>Try adjusting the filters.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>Event</th>
              <th>Entity</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>{formatDate(event.createdAt)}</td>
                <td>{actorLabel(event.actorId)}</td>
                <td>{eventLabel(event.eventType)}</td>
                <td>
                  {event.entityType}
                  {event.entityId ? ` · ${event.entityId.slice(0, 6)}…` : ""}
                </td>
                <td style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{detailsSummary(event.details)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}