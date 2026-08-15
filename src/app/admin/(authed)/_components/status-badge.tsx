type ContentStatus = "draft" | "scheduled" | "published";

export function StatusBadge({ status }: { status: ContentStatus | string }) {
  const known = (["draft", "scheduled", "published"] as const).includes(
    status as ContentStatus,
  );
  const className = `status-badge ${known ? status : "draft"}`;
  return <span className={className}>{status}</span>;
}
