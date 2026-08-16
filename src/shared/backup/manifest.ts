import { createHash } from "node:crypto";

/**
 * Phase C backup manifest.
 *
 * Holds metadata only — media binaries stay in object storage. Restoring
 * assumes the bucket (or a copy) is reachable separately; the manifest
 * lists the keys so the operator can verify presence and download if needed.
 */
export type BackupMediaEntry = {
  id: string;
  filename: string;
  storageKey: string;
  mimeType: string;
  size: number;
  alt: string | null;
  caption: string | null;
  createdAt: string;
};

export type BackupManifest = {
  schemaVersion: 1;
  generatedAt: string;
  generator: string;
  counts: {
    posts: number;
    pages: number;
    media: number;
  };
  media: BackupMediaEntry[];
};

export const BACKUP_GENERATOR = "tycoma-cms/v0.7.0";

/**
 * Stable JSON canonicalisation: keys are sorted recursively so the SHA-256
 * of two byte-equivalent manifests is identical regardless of insertion order.
 */
export function canonicalise(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalise).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalise(v)}`).join(",")}}`;
}

export function checksumManifest(manifest: BackupManifest): string {
  return createHash("sha256").update(canonicalise(manifest), "utf8").digest("hex");
}

/**
 * Result of validating an exported manifest. Returns the list of expected
 * keys/checksums and any discrepancies. Importing code decides what to do
 * with the report (warn, abort, or surface to the operator).
 */
export type ManifestValidation = {
  ok: boolean;
  totalMedia: number;
  missingKeys: string[];
  mismatchedSizes: { key: string; expected: number; actual: number | null }[];
};

export async function validateManifestAgainstStorage(
  manifest: BackupManifest,
  lookup: (key: string) => Promise<{ size: number | null }>,
): Promise<ManifestValidation> {
  const missing: string[] = [];
  const mismatched: ManifestValidation["mismatchedSizes"] = [];
  for (const entry of manifest.media) {
    const probe = await lookup(entry.storageKey);
    if (probe.size === null) {
      missing.push(entry.storageKey);
      continue;
    }
    if (probe.size !== entry.size) {
      mismatched.push({ key: entry.storageKey, expected: entry.size, actual: probe.size });
    }
  }
  return {
    ok: missing.length === 0 && mismatched.length === 0,
    totalMedia: manifest.media.length,
    missingKeys: missing,
    mismatchedSizes: mismatched,
  };
}
