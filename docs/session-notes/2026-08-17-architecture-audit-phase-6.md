# Session notes — Architecture audit, Phase 6

**Date:** 2026-08-17
**Branch:** `main`
**No git tag** (post-`v0.7.0` follow-up work, tracked under `Unreleased`).

## What landed

**Phase 6 — Technical debt backlog (findings 6.1–6.7).** All seven items ticked:

- **6.1 Strict status validation.** The admin post/content-entry actions replaced the silently
  degrading `z.preprocess(... → "draft")` with a plain `z.enum(["draft", "scheduled",
  "published"])` in `src/app/admin/_actions/content.ts` and `content-types.ts`. Invalid statuses
  now fail the request instead of being hidden behind a default.
- **6.2 Password confirmation in the domain.** `createChangePassword` now takes `confirmPassword`,
  compares it with `newPassword` and returns a `Result` error (`"New passwords do not match."`)
  instead of the Server Action throwing. New unit test pins the mismatch path.
- **6.3 Media filters wired.** `/admin/media` now passes `{ search, mimePrefix }` to
  `media.listMediaWithUrls(...)`; `listMediaWithUrls` reuses the `listMedia` use case (which
  already supported the query) instead of calling the repository directly.
- **6.4 `countByStatus` via `parseContentStatus`.** Both the post and page Prisma adapters now
  run each group's `status` through `parseContentStatus`, so unknown persisted statuses throw
  instead of leaking into the dashboard KPI map.
- **6.5 Explicit `toDomain` mappers.** `mapUser` (auth), `mapMediaAsset` (media) and
  `mapPasswordResetToken` (auth) construct domain entities field-by-field — no more `return row`
  identity mapper or `as` casts.
- **6.6 Policy defaults centralised.** New `content/domain/policies.ts` owns `LATEST_POSTS_LIMIT`
  and the post-list default sort/order (`POST_LIST_DEFAULT_SORT`/`POST_LIST_DEFAULT_ORDER`);
  Argon2id parameters moved from the adapter into `auth/domain/policies.ts` as `ARGON2_OPTIONS`.
- **6.7 `SessionIssuer` composes `SessionVerifier`.** `domain/session.ts` now defines
  `SessionVerifier` first and `SessionIssuer = SessionVerifier & { issue }`, so `verify` has a
  single surface. `jwtSessionIssuer` keeps delegating `verify` to `jwtSessionVerifier.verify`.

## Gates

```text
npm test                  → 188/188 pass (+1 new mismatch test)
npm run lint              → clean
npm run typecheck         → clean
npm run build             → clean
purity grep               → clean (no framework imports in domain/application)
npm audit --omit=dev --audit-level=high → found 0 vulnerabilities
```

## Doc sync (AGENTS.md rule 9)

- `README.md` — Current State gains an "architecture audit in progress" bullet (Phases 5–6).
- `CHANGELOG.md` — `Unreleased` gains a `Changed` section covering 6.1–6.7.
- `tasks/tycoma-architecture-audit-action-plan.md` — 6.1–6.7 ticked complete.
- `docs/lessons.md` — unchanged (no new durable rule).
- `AGENTS.md` — "Known technical debt" unchanged (nothing new added).

## CI note

This session also closed the CI red introduced by `CVE-2026-40345`: the deepmerge-ts override
was already in place (previous session), and the lockfile was regenerated with **npm 11.17.0
(Node 24.19.0)** — the exact npm CI uses — after discovering npm 11.6.2 resolves the `@emnapi/*`
optional tree differently. Lesson recorded in `docs/lessons.md`; `npm ci` on the CI npm is the
only reliable lockfile sanity check.