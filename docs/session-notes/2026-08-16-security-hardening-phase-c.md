# Session notes — Security Hardening Phase C (v0.7.0)

**Date:** 2026-08-16
**Branch:** `main`
**No git tag** (per the locked decision — `v0.7.0` is documented in
`CHANGELOG.md` / `README.md` / `docs/releases/v0.7.0.md` and will be cut when
the human asks).

## What landed

Operational excellence + A/B residuals. Implementation followed the locked
decision set (1–14) — every choice was applied verbatim, no second-guessing.

- **CI security gate.** `.github/workflows/ci.yml` runs
  `npm audit --omit=dev --audit-level=high` right after `npm ci`. The current
  tree reports `found 0 vulnerabilities`.
- **Dependabot weekly.** `.github/dependabot.yml` for the `npm` ecosystem;
  patch + minor updates batched, majors stay as individual PRs.
- **Step-up on destructive deletes.** `createDeletePost`, `createDeletePage`,
  `createDeleteMedia` and the bulk-delete branch of `createBulkPosts` all
  call `StepUpStore.has(actorId)` before touching the database. The 10-minute
  Redis TTL marker from Phase B is reused — no second step-up system. New
  `<StepUpHint />` admin component surfaces the prompt above the delete form
  on `/admin/posts`, `/admin/pages/[id]`, and `/admin/media/[id]`.
- **SigV4 presigned media URLs.** New `MediaAssetWithUrl` shape and
  `media.listMediaWithUrls()` / `media.getMediaWithUrl(id)` use cases route
  every read through a single TTL constant (`SIGNED_URL_TTL_SECONDS = 30 min`).
  Implementation uses `node:crypto` only — no `@aws-sdk/*` direct dependency
  was added.
- **Backup manifest + checksum.** New `src/shared/backup/manifest.ts` defines
  the v1 schema (metadata + object keys; binaries stay in the bucket) with
  stable JSON canonicalisation. `scripts/backup-roundtrip.mjs` proves the
  export → SHA-256 → re-import loop without Docker.
- **`/.well-known/security.txt`** (RFC 9116). Rolling one-year `Expires`,
  generated at request time. New `SECURITY_CONTACT` env var.
- **COOP on `/admin/:path*`.** `Cross-Origin-Opener-Policy: same-origin` in
  `next.config.ts`. Public site is unaffected.
- **CSP stays Report-Only.** Documented as a residual in `docs/lessons.md`;
  enforcement is a follow-up epic (nonce pipeline).
- **Documentation.** New `docs/release-runbook.md`; testing playbook gained a
  § Security regression block; README Current State, CHANGELOG, AGENTS.md
  "Known technical debt" updated.

## Decisions captured (recap of the locked set)

| #   | Decision                                | Outcome                                                                 |
| --- | --------------------------------------- | ----------------------------------------------------------------------- |
| 1   | Dependabot vs Renovate                  | Dependabot — GitHub-native, zero extra dependency                       |
| 2   | Audit level                             | `high` (critical + high fail CI)                                        |
| 3   | Signed URL approach                     | `node:crypto` SigV4 query-string presign; no new direct dependency      |
| 4   | Signed URL TTL                          | 30 min, named constant                                                  |
| 5   | CSP enforce vs Report-Only              | Keep Report-Only; residual lesson entry                                 |
| 6   | Restore drill proof                     | `scripts/backup-roundtrip.mjs` — export, checksum, re-import            |
| 7   | Backup export scope                     | Metadata + object keys only; binaries stay in bucket                    |
| 8   | security.txt Expires                    | Rolling one year from response generation                               |
| 9   | Step-up on deletes                      | Single post/page/media + bulk posts; reused `StepUpStore`               |
| 10  | Dependabot schedule                     | Weekly                                                                  |
| 11  | Advisory allowlist                      | Mechanism only, empty by default                                        |
| 12  | COOP on /admin                          | `same-origin`                                                           |
| 13  | CI order                                | `npm ci` → `npm audit` → `lint` → `typecheck` → `test` → `build`        |
| 14  | Tag target                              | `v0.7.0`; human runs `git tag -a v0.7.0 -m …`                           |

## Notable code changes

- `src/modules/content/domain/types.ts` — `PostWriter` gains a single-item
  `delete(id)` (previously only `deleteMany`).
- `src/modules/content/infrastructure/prisma-content-repositories.ts` —
  implements the new `delete(id)` for posts.
- `src/modules/content/application/use-cases/posts.ts` — new
  `createDeletePost`; `createBulkPosts` now requires `StepUpStore`.
- `src/modules/content/application/use-cases/pages.ts` — `createDeletePage`
  now requires `StepUpStore`.
- `src/modules/media/application/use-cases/delete-media.ts` — requires
  `StepUpStore`.
- `src/modules/media/domain/signed-url.ts` (new) — port + `signMediaUrl`
  helper + `SIGNED_URL_TTL_SECONDS`.
- `src/modules/media/infrastructure/s3-object-storage.ts` — SigV4 query-string
  presign via `node:crypto`.
- `src/modules/media/application/use-cases/attach-signed-url.ts` (new) —
  `MediaAssetWithUrl` shape.
- `src/modules/media/application/index.ts` — exposes `listMediaWithUrls` and
  `getMediaWithUrl`.
- `src/app/admin/(authed)/_components/step-up-hint.tsx` (new) — reused by
  `/admin/posts`, `/admin/pages/[id]`, `/admin/media/[id]`.
- `src/app/.well-known/security.txt/route.ts` (new) — RFC 9116 handler.
- `src/shared/backup/manifest.ts` + `manifest.test.ts` (new) — backup schema
  + canonicalise + checksum + validate.
- `scripts/backup-roundtrip.mjs` (new) — export → checksum → re-import.
- `next.config.ts` — `/admin/:path*` gets COOP `same-origin`.
- `.github/workflows/ci.yml` — `npm audit --omit=dev --audit-level=high`
  between `npm ci` and `lint`.
- `.github/dependabot.yml` (new).
- `src/shared/env.ts` — `SECURITY_CONTACT` env var (default
  `admin@example.test`).
- `.env.example` — `SECURITY_CONTACT` documented.

## Gates

```text
npm test                  → 142/142 pass
npm run lint              → clean
npm run typecheck         → clean
npm run build             → clean
npm audit --omit=dev      → found 0 vulnerabilities
purity grep               → clean
```

`backup-roundtrip.mjs` roundtrip verified manually:

```text
$ node --no-warnings --experimental-strip-types scripts/backup-roundtrip.mjs > /tmp/backup.json
$ node --no-warnings --experimental-strip-types scripts/backup-roundtrip.mjs --import /tmp/backup.json
OK — manifest checksum verified: 4c0f66c0459db18daf257e7331b81324191ac46bab17011d9991a47fa67b0fa0
```

## Decisions deferred (residual)

- **CSP enforce** — documented in `docs/lessons.md`. Nonce pipeline is its
  own follow-up epic.
- **2FA TOTP** — skipped (no human-approved library).
- **Sliding / remember-me** — skipped.
- **Full LocalStack-backed restore drill in CI** — out of Phase C scope; the
  in-repo proof is the script's checksum loop. A one-time human-run drill is
  optional and tracked in the runbook.

## Doc sync (AGENTS.md rule 9)

- `README.md` — Current State now leads with `v0.7.0`; Documentation table
  gets `v0.7.0.md` and `release-runbook.md`.
- `CHANGELOG.md` — `[v0.7.0]` entry with Added / Changed / Residual.
- `docs/releases/v0.7.0.md` (new) — milestone notes, all decisions logged.
- `docs/release-runbook.md` (new) — single procedure humans run before
  tagging.
- `docs/testing-playbook.md` — § Security regression block added.
- `docs/lessons.md` — three new entries:
  1. CSP enforcement is a follow-up, not Phase C scope.
  2. SigV4 presigning without the SDK.
  3. Advisory allowlist is mechanism-only.
- `AGENTS.md` § *Known technical debt* — updated to note Phase C closed the
  Phase B residuals.
- `tasks/tycoma-security-hardening-phase-c-backlog.md` — every story C1–C33
  ticked; document status flipped to *Complete*; DoD `[x]` except the gates
  marker, which is the last remaining open bullet until the human tags.

## Pending human actions

1. `git tag -a v0.7.0 -m "v0.7.0 — security hardening phase C"`
2. `git push origin v0.7.0`
3. Set `SECURITY_CONTACT` to the real mailbox in production `.env` /
   vault.
4. (Optional) one-time LocalStack restore drill to capture a real timestamp
   in `docs/lessons.md`.

## Lessons

Same three as in `docs/lessons.md`; the durable ones worth re-reading:

- **Don't flip CSP to enforce in a side change.** Track the nonce epic
  separately; otherwise the admin or public site breaks.
- **Prefer stdlib over a new dep.** SigV4 presign worked out to ~100 lines
  of `node:crypto`. The default should be "port to the stdlib" before
  asking for an SDK.
- **Audit allowlist mechanism, not a pre-baked list.** Empty by default;
  per-advisory lessons entry when an exception is needed.

## Git state

- `main` at `2e7f618` (this session's commit). Pushed to origin.
- Working tree clean.
- `git tag -l` still shows `v0.6.0` as the latest; `v0.7.0` is documented
  but not tagged.
