import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <p style={{ margin: 0, fontWeight: 600 }}>{title}</p>
      {description ? (
        <p style={{ margin: "0.35rem 0 0", fontSize: "0.875rem" }}>{description}</p>
      ) : null}
      {action ? <div style={{ marginTop: "0.85rem" }}>{action}</div> : null}
    </div>
  );
}
