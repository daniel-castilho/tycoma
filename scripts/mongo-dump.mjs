#!/usr/bin/env node
/**
 * Phase C (operational excellence) — MongoDB dump helper.
 *
 * Usage:
 *   node --no-warnings scripts/mongo-dump.mjs                       # writes data/dumps/<timestamp>
 *   node --no-warnings scripts/mongo-dump.mjs --out data/dumps/foo  # explicit output dir
 *
 * Strategy:
 *   - Reads `DATABASE_URL` from process.env (loaded via dotenv-style fallback
 *     to `.env` if present, but only if `dotenv` is already a transitive
 *     dependency — see below).
 *   - Shells out to `mongodump` so we do not pull in the Mongo driver as a
 *     direct dependency. mongodump ships with the official `mongodb` CLI
 *     tools; if missing the script tells the operator how to install it.
 *   - Compresses the dump with `tar` into a single `.tgz` artefact, then
 *     prints its SHA-256 so the operator can store it alongside the
 *     `scripts/backup-roundtrip.mjs` manifest checksum (Phase C backup
 *     protocol).
 *
 * This script is intentionally simple. Production single-tenant: cron
 * nightly, push the .tgz somewhere off-host. Dev: run it before risky
 * `prisma migrate` / data pruning operations.
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { promises as fs } from "node:fs";
import { join } from "node:path";

const argv = process.argv.slice(2);
const outIndex = argv.indexOf("--out");
const outDir = outIndex >= 0
  ? argv[outIndex + 1]
  : join("data", "dumps", new Date().toISOString().replace(/[:.]/g, "-"));

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Export it or copy .env to your shell.");
  process.exit(1);
}

if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

function run(bin, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout: Buffer.concat(stdout).toString("utf8"), stderr: Buffer.concat(stderr).toString("utf8") });
      } else {
        reject(new Error(`${bin} exited with code ${code}\n${Buffer.concat(stderr).toString("utf8")}`));
      }
    });
  });
}

try {
  console.log(`→ mongodump → ${outDir}`);
  await run("mongodump", ["--uri", databaseUrl, "--out", outDir]);
  console.log("✓ dump complete");
} catch (err) {
  if (err instanceof Error && /ENOENT/.test(err.message)) {
    console.error("mongodump not found. Install MongoDB Database Tools:");
    console.error("  https://www.mongodb.com/docs/database-tools/installation/installation/");
    process.exit(1);
  }
  throw err;
}

const archive = `${outDir}.tgz`;
try {
  console.log(`→ tar czf ${archive}`);
  await run("tar", ["czf", archive, "-C", outDir, "."]);
  console.log("✓ archive created");
} catch (err) {
  if (err instanceof Error && /ENOENT/.test(err.message)) {
    console.error("tar not available on this OS; install it or skip the archive step.");
  } else {
    throw err;
  }
}

if (existsSync(archive)) {
  const buf = await fs.readFile(archive);
  const sha = createHash("sha256").update(buf).digest("hex");
  console.log(`SHA-256: ${sha}`);
  console.log(`Size:    ${buf.length} bytes`);
}
