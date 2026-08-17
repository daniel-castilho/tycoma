# Session notes — Architecture audit, Phase 5

**Date:** 2026-08-17
**Branch:** `main`
**No git tag** (post-`v0.7.0` follow-up work, tracked under `Unreleased`).

## What landed

**Phase 5 — Layer & composition (finding 5.1).** The media upload rate limit moved out of the
route into the `media` module:

- New policy constants `UPLOAD_RATE_LIMIT = 30` and `UPLOAD_RATE_WINDOW_SECONDS = 60 * 15` in
  `src/modules/media/domain/policies.ts`.
- New use case `createCheckUploadRate(limiter)` in
  `src/modules/media/application/use-cases/check-upload-rate.ts` — builds the
  `upload:{userId}:{ip}` key and asks the injected `RateLimiter` port (auth domain port, shared
  Redis adapter).
- `createMediaApplication` gains a `rateLimiter: RateLimiter` dependency; `src/app/_lib/modules.ts`
  injects `redisRateLimiter`.
- `src/app/api/media/route.ts` now calls `media.checkUploadRate(session.sub, ip)` — no more
  `getRedis()` or hardcoded constants in the route.
- Tests: `check-upload-rate.test.ts` (key + policy constants passed through, denies when limiter
  denies).

## Gates

```text
npm test                  → 187/187 pass (+2)
npm run lint              → clean
npm run typecheck         → clean
npm run build             → clean
purity grep               → clean (no framework imports in domain/application)
```

## Doc sync (AGENTS.md rule 9)

- `README.md` — Current State gains a "layer & composition" post-tag follow-up bullet.
- `CHANGELOG.md` — `Unreleased` entry for finding 5.1.
- `tasks/tycoma-architecture-audit-action-plan.md` — Phase 5.1 ticked complete.
- `docs/lessons.md` — unchanged (the change follows the existing "cross-module ports wired by a
  framework composition root" rule; nothing new learned).
- `AGENTS.md` — unchanged (no new known technical debt).

## Pending human actions / next session

1. **Phase 6** (backlog): strict `z.enum` for status, `changePassword` confirms its own
   passwords, dead `q`/`type` filters on the media library page, `countByStatus` via
   `parseContentStatus`, explicit `toDomain` mappers, policy defaults in `domain/policies.ts`,
   single `SessionVerifier` surface.
2. **Phase 7** — final doc sync checklist + full gate pass.
3. **SMTP adapter** — env-gated real mailer in `tasks/tycoma-smtp-mailer-backlog.md`.

## Git state

- Working tree: modified (Phase 5 changes + this note), not yet committed.
- Latest tag is `v0.7.0`; the follow-up work lives under `Unreleased`.