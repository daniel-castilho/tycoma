#!/usr/bin/env node
/**
 * Phase C backup round-trip script.
 *
 * Usage:
 *   node --experimental-strip-types scripts/backup-roundtrip.mjs
 *
 * The script is test-friendly: it does not talk to Mongo or S3. CI verifies
 * that export → SHA-256 → re-import succeeds. Real backends plug the
 * `populateMedia` / `probeStorage` hooks with Prisma + LocalStack/S3 calls.
 *
 * CI smoke run:
 *   node --no-warnings --experimental-strip-types scripts/backup-roundtrip.mjs > /tmp/backup.json
 *   node --no-warnings --experimental-strip-types scripts/backup-roundtrip.mjs --import /tmp/backup.json
 */

// Suppress Node's MODULE_TYPELESS_PACKAGE_JSON warnings so stdout stays
// pure JSON for piping into `jq`, file redirection, or the importer.
process.removeAllListeners("warning");

import { createHash } from "node:crypto";
import { canonicalise, checksumManifest } from "../src/shared/backup/manifest.ts";

const argv = process.argv.slice(2);
const importPath = argv.includes("--import") ? argv[argv.indexOf("--import") + 1] : null;

if (importPath) {
  const fs = await import("node:fs/promises");
  const raw = await fs.readFile(importPath, "utf8");
  const parsed = JSON.parse(raw);
  const { checksum, ...rest } = parsed;
  const recomputed = createHash("sha256").update(canonicalise(rest), "utf8").digest("hex");
  if (recomputed !== checksum) {
    console.error("Checksum mismatch.");
    console.error(`expected: ${checksum}`);
    console.error(`actual:   ${recomputed}`);
    process.exit(1);
  }
  console.log(`OK — manifest checksum verified: ${recomputed}`);
  process.exit(0);
}

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  generator: "tycoma-cms/v0.7.0",
  counts: { posts: 0, pages: 0, media: 0 },
  media: [],
};

const checksum = checksumManifest(manifest);
const wrapped = { ...manifest, checksum };
process.stdout.write(JSON.stringify(wrapped, null, 2) + "\n");
