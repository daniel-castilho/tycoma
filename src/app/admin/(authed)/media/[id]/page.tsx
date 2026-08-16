import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { content, media } from "@/app/_lib/modules";
import { deleteMediaAction, saveMediaMetadataAction } from "@/app/admin/_actions/media";
import { TextArea, TextField } from "@/app/admin/(authed)/_components/form-field";
import { SubmitButton } from "@/app/admin/(authed)/_components/submit-button";
import { StepUpHint } from "@/app/admin/(authed)/_components/step-up-hint";
import { requireSession } from "@/app/admin/_lib/session";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export default async function MediaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const asset = await media.getMediaWithUrl(id);
  if (!asset) notFound();

  const usages = await media.getMediaUsages(id);
  const usageLabels = await Promise.all(
    usages.map(async (u) => {
      if (u.type === "post") {
        const post = await content.getPost(u.id);
        return { href: `/admin/posts/${u.id}`, title: post?.title ?? u.id };
      }
      const page = await content.getPage(u.id);
      return { href: `/admin/pages/${u.id}`, title: page?.title ?? u.id };
    }),
  );

  return (
    <>
      <h2>{asset.filename}</h2>
      <p className="lead">{asset.mimeType} · {formatBytes(asset.size)} · uploaded {formatDate(asset.createdAt)}</p>

      <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(20rem, 1fr))" }}>
        <section>
          {isImage(asset.mimeType) ? (
            <div style={{ position: "relative", maxWidth: "28rem", height: "20rem" }}>
              <Image
                src={asset.signedUrl}
                alt={asset.alt ?? asset.filename}
                fill
                sizes="448px"
                style={{ objectFit: "contain" }}
              />
            </div>
          ) : (
            <div className="empty-state">
              <p style={{ margin: 0, fontWeight: 600 }}>Not a previewable image</p>
              <p style={{ margin: "0.35rem 0 0", fontSize: "0.875rem" }}>
                <a href={asset.signedUrl} target="_blank" rel="noreferrer">
                  Open the file
                </a>
              </p>
            </div>
          )}

          <details style={{ marginTop: "1rem" }}>
            <summary style={{ cursor: "pointer", color: "var(--accent)" }}>File details</summary>
            <dl style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
              <dt>Signed URL (30 min)</dt>
              <dd>
                <code style={{ wordBreak: "break-all" }}>{asset.signedUrl}</code>
              </dd>
              <dt>Storage key</dt>
              <dd>
                <code>{asset.storageKey}</code>
              </dd>
            </dl>
          </details>
        </section>

        <section>
          <form action={saveMediaMetadataAction} className="form-stack" style={{ gap: "1rem" }}>
            <input type="hidden" name="id" value={asset.id} />
            <TextField label="Alt text" name="alt" defaultValue={asset.alt ?? ""} hint="Describes the image for accessibility and SEO." />
            <TextArea label="Caption" name="caption" defaultValue={asset.caption ?? ""} rows={3} />
            <SubmitButton label="Save metadata" />
          </form>
        </section>
      </div>

      <section style={{ marginTop: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem" }}>Used in</h2>
        {usageLabels.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
            This file is not referenced by any content yet.
          </p>
        ) : (
          <ul>
            {usageLabels.map((u) => (
              <li key={u.href}>
                <Link href={u.href}>{u.title}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: "1.5rem" }}>
        <StepUpHint userId={session.sub} />
        <form action={deleteMediaAction}>
          <input type="hidden" name="id" value={asset.id} />
          <button type="submit" className="btn-danger">
            Delete file
          </button>
        </form>
      </section>
    </>
  );
}