"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type UploadStatus = { filename: string; ok: boolean; message?: string };

export function UploadDropzone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<UploadStatus[]>([]);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setStatus([]);
    const results: UploadStatus[] = [];
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("files", file);
      try {
        const res = await fetch("/api/media", { method: "POST", body: form });
        const json = (await res.json()) as { uploaded?: { filename: string; error?: string }[] };
        const entry = json.uploaded?.find((u) => u.filename === file.name);
        if (entry?.error) {
          results.push({ filename: file.name, ok: false, message: entry.error });
        } else {
          results.push({ filename: file.name, ok: true });
        }
      } catch {
        results.push({ filename: file.name, ok: false, message: "Upload failed." });
      }
    }
    setStatus(results);
    setBusy(false);
    router.refresh();
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*,application/pdf,.pdf"
        onChange={(e) => onFiles(e.target.files)}
        disabled={busy}
      />
      <p className="hint">
        {busy ? "Uploading…" : "Choose one or more files to upload."}
      </p>
      {status.length > 0 ? (
        <ul style={{ fontSize: "0.875rem", margin: "0.5rem 0 0", paddingLeft: "1.25rem" }}>
          {status.map((s) => (
            <li key={s.filename} style={{ color: s.ok ? "var(--success, #15803d)" : "var(--danger, #b91c1c)" }}>
              {s.filename} — {s.ok ? "Uploaded" : s.message}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}