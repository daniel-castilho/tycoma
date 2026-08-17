type ContentStatus = "draft" | "scheduled" | "published";

export function StatusBadge({ status }: { status: ContentStatus }) {
  return <span className={`status-badge ${status}`}>{status}</span>;
}
