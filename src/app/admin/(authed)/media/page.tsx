import Image from "next/image";
import Link from "next/link";
import { z } from "zod";
import { media } from "@/app/_lib/modules";
import { UploadDropzone } from "./_components/upload-dropzone";

const filtersSchema = z.object({
  q: z.string().trim().optional(),
  type: z.enum(["image", "video", "audio", "application"]).optional().catch(undefined),
});

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const filters = filtersSchema.parse(await searchParams);
  const assets = await media.listMedia({
    search: filters.q,
    mimePrefix: filters.type,
  });

  return (
    <>
      <h2>Media library</h2>
      <p className="lead">Upload files and manage their metadata.</p>

      <section className="admin-toolbar" style={{ flexWrap: "wrap" }}>
        <form method="get" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <input className="btn-secondary" type="search" name="q" defaultValue={filters.q} placeholder="Search…" />
          <select className="btn-secondary" name="type" defaultValue={filters.type ?? ""}>
            <option value="">All types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="audio">Audio</option>
            <option value="application">Documents</option>
          </select>
          <button type="submit" className="btn-secondary">
            Filter
          </button>
        </form>
      </section>

      <section style={{ margin: "1rem 0", padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "0.4rem" }}>
        <UploadDropzone />
      </section>

      {assets.length === 0 ? (
        <div className="empty-state">
          <p style={{ margin: 0, fontWeight: 600 }}>No media yet</p>
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.875rem" }}>
            Upload your first file with the box above.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))",
          }}
        >
          {assets.map((asset) => (
            <Link
              key={asset.id}
              href={`/admin/media/${asset.id}`}
              className="media-card"
              style={{
                display: "block",
                border: "1px solid var(--border)",
                borderRadius: "0.4rem",
                overflow: "hidden",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              {isImage(asset.mimeType) ? (
                <div style={{ position: "relative", width: "100%", height: "8rem" }}>
                  <Image
                    src={asset.url}
                    alt={asset.alt ?? asset.filename}
                    fill
                    sizes="176px"
                    style={{ objectFit: "cover" }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "8rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--surface-alt, #f4f4f5)",
                    fontSize: "0.875rem",
                    color: "var(--muted)",
                  }}
                >
                  {asset.mimeType}
                </div>
              )}
              <div style={{ padding: "0.5rem" }}>
                <div style={{ fontSize: "0.875rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {asset.filename}
                </div>
                <div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{formatBytes(asset.size)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}