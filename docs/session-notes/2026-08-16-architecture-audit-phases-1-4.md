# Session notes — Architecture audit, Phases 1–4

**Date:** 2026-08-16
**Branch:** `main`
**No git tag** (post-`v0.7.0` follow-up work, tracked under `Unreleased`).

## What landed

A full architecture audit (Hexagonal, Clean Code, SOLID, Twelve-Factor) against
`v0.7.0` produced 2 critical, 7 major and ~8 minor findings. The action plan
(`tasks/tycoma-architecture-audit-action-plan.md`) defines Phases 1–7; the first
four are done and pushed. Every decision was applied verbatim from the human's
locked set — no second-guessing.

- **Phase 1 — password-reset token no longer logged (critical).** The `Mailer`
  port now receives `{ appUrl, token }` instead of a prebuilt `resetUrl`; the
  console mailer logs only the recipient and the reset page path. A regression
  test pins that the token reaches only the mailer and never appears in the
  use-case result. Real env-gated SMTP adapter tracked in
  `tasks/tycoma-smtp-mailer-backlog.md`.
- **Phase 2 — auth hardening (major).** Mutating admin Server Actions
  (`savePage`, `saveCategory`, `saveTag`) now call `requireSession()` and pass
  `session.sub`; the content use cases record `actorId`-bearing audit events.
  Session lifetime is a single canonical `SESSION_TTL_SECONDS` shared by the JWT
  issuer and the session cookie. `AUTH_SECRET` hygiene moved to a pure shared
  `validateAuthSecret` (`src/shared/kernel/secret.ts`) used by both `env.ts` and
  the Edge verifier, which now fails closed on weak secrets.
- **Phase 3 — S3 presigned URLs (major).** Presign was broken in dev: hardcoded
  `https://` (LocalStack is plain HTTP) and virtual-host addressing while
  upload/delete used path-style — so the SigV4 signature could never validate
  against the same bucket addressing as the upload. New pure
  `src/modules/media/infrastructure/s3-presign.ts` (`parseEndpoint`,
  `resolveTarget`, `buildSignedUrl`); scheme derives from `S3_ENDPOINT`
  (https fallback only when missing), `S3_FORCE_PATH_STYLE` is honored, and one
  addressing mode is shared by put/delete/ensureBucket/presign. No new npm
  dependency (stdlib `node:crypto` only).
- **Phase 4 — domain correctness (major).** Media-usage detection is now a
  schema-aware domain rule (`containsMediaReference` in
  `src/modules/content/domain/media-reference.ts`): only fields declared as
  `media` are inspected, recursively inside the field value (string, array,
  nested object). A `text`/`longtext` value containing the same 24-char hex no
  longer blocks media deletion (Option B). `PostWriter`/`PageWriter.create` now
  take `PostWrite`/`PageWrite` instead of the full entity — the adapter stops
  silently stripping `id` while persisting caller-supplied timestamps; the DB
  owns `id`/`createdAt`/`updatedAt`.
- **Tooling.** `eslint.config.mjs` ignores `data/**` — the root-owned
  `data/mongo/.mongodb` bind mount (created by the Mongo container) made
  `npm run lint` fail with `EACCES`.

## Decisions captured (recap of the locked sets)

| Phase | Decision                                        | Outcome                                                                 |
| ----- | ----------------------------------------------- | ----------------------------------------------------------------------- |
| 1     | Mailer port contract                            | `{ appUrl, token }`; adapters build the URL, never log the token         |
| 2     | Session guard on mutations                      | `requireSession()` + `actorId` on savePage/Category/Tag, with audit      |
| 2     | Session TTL source of truth                     | `SESSION_TTL_SECONDS` in `auth/domain/policies.ts`                        |
| 2     | AUTH_SECRET hygiene                             | Shared `validateAuthSecret`; Edge verifier fails closed                   |
| 3     | Scheme source                                   | From `S3_ENDPOINT`; https fallback only when scheme missing               |
| 3     | Addressing mode                                 | `S3_FORCE_PATH_STYLE === "true"` (path-style default for LocalStack)      |
| 3     | Presign testability                             | Export pure `buildSignedUrl`/`parseEndpoint`; no SDK                      |
| 4.1   | Media reference detection                       | Option B — schema-aware, recursive inside `media` fields only             |
| 4.2   | Create ports                                    | `create(PostWrite)` / `create(PageWrite)`; DB owns identity + timestamps  |

## Notable code changes

- `src/modules/auth/domain/mailer.ts` — port takes `{ appUrl, token }`.
- `src/modules/auth/infrastructure/console-mailer.ts` — token never logged.
- `src/modules/auth/application/use-cases/request-password-reset.ts` — no longer
  builds `resetUrl` in the use case.
- `src/modules/auth/domain/policies.ts` — `SESSION_TTL_SECONDS` canonical.
- `src/shared/kernel/secret.ts` (new) — `validateAuthSecret`; used by `env.ts`
  and the Edge `jwt-session-verifier`.
- `src/modules/content/application/use-cases/posts.ts`, `pages.ts` — actorId +
  audit on create/update; `create` uses `*Write` models.
- `src/modules/content/application/use-cases/taxonomy.ts` — category/tag
  mutations take `actorId` + audit.
- `src/modules/content/domain/types.ts` — `PostWriter`/`PageWriter.create`
  accept `*Write`.
- `src/modules/content/domain/media-reference.ts` (new) — `containsMediaReference`.
- `src/modules/content/infrastructure/prisma-content-type-repositories.ts` —
  `findEntryIdsUsingMedia` loads field defs and delegates to the domain helper.
- `src/modules/content/infrastructure/prisma-content-repositories.ts` —
  `create` no longer strips `id`; persists only write fields.
- `src/modules/media/infrastructure/s3-presign.ts` (new) — pure SigV4 builder +
  addressing.
- `src/modules/media/infrastructure/s3-object-storage.ts` — reuses the pure
  builder; honors `S3_FORCE_PATH_STYLE` everywhere.
- `eslint.config.mjs` — `ignores: ["data/**"]`.
- Tests: `password-reset.test.ts` (regression), `jwt-session-issuer.test.ts`,
  `jwt-session-verifier.test.ts`, `secret.test.ts`, `s3-presign.test.ts`,
  `media-reference.test.ts`; mocks updated for `*Write` ports.

## Gates

```text
npm test                  → 185/185 pass
npm run lint              → clean
npm run typecheck         → clean
npm run build             → clean
purity grep               → clean (no framework imports in domain/application)
```

Smoke tests run against Docker services (`npm run docker:up`):

- **Phase 3 (LocalStack):** upload → signed GET 200 with exact body → delete.
  5/5 passed. Signed URL now starts with `http://` and matches the upload's
  host/path.
- **Phase 4 (Mongo):** schema-aware detection (top-level, nested array, nested
  object matched; text with same hex and unrelated id not matched) and
  `create(PostWrite)`/`create(PageWrite)` returning full entities from the DB.
  9/9 passed. Test data cleaned up afterwards.

## Decisions deferred / residuals

- **Phase 5** — media upload rate limit goes through a `media` domain
  port/application service instead of `getRedis()` + hardcoded constants in
  `src/app/api/media/route.ts`.
- **Phase 6 (backlog)** — strict `z.enum` for status (no silently-degrading
  `preprocess`); `newPassword === confirmPassword` into the `changePassword` use
  case; apply dead `q`/`type` filters on the media library page; `countByStatus`
  via `parseContentStatus`; explicit `toDomain` mappers (`mapUser`,
  `prisma-media-repository`, `prisma-password-reset-token-repository`); lift
  policy defaults into `domain/policies.ts`.
- **Phase 7** — final doc sync checklist.
- **SMTP adapter** — env-gated real mailer (finding 1.3) in
  `tasks/tycoma-smtp-mailer-backlog.md`.

## Doc sync (AGENTS.md rule 9)

- `README.md` — Current State gains post-tag follow-up bullets (auth hardening,
  S3 presign, domain correctness).
- `CHANGELOG.md` — `Unreleased` entries for Phases 1–4.
- `docs/lessons.md` — five new durable rules (session guard on mutations,
  AUTH_SECRET hygiene shared + fail-closed, S3 SigV4 host binding, usage lookups
  are domain rules, repository `create` takes write models).
- `tasks/tycoma-architecture-audit-action-plan.md` — Phases 1–4 ticked complete.
- `AGENTS.md` — unchanged (no new known technical debt).

## Pending human actions / next session

1. Start **Phase 5** — route the media upload rate limit through a `media`
   domain port/application service (replace `getRedis()` + hardcoded constants
   in `src/app/api/media/route.ts`).
2. Then Phases 6 (backlog) and 7 (final doc sync), on human instruction.

## Lessons

The durable ones, mirrored in `docs/lessons.md`:

- **SigV4 signs the host header.** Presign and upload must share one addressing
  mode or the signature never validates. Derive scheme from `S3_ENDPOINT`.
- **Usage lookups are domain rules, not JSON scans.** Schema-aware, recursive
  inside media fields; extend the field-type allowlist, never fall back to
  "any string in the tree".
- **Repository `create` ports take write models.** If an adapter must ignore a
  field, the port type is too wide — narrow it instead of stripping.
- **AUTH_SECRET hygiene must be shared and fail-closed** across Edge and Node;
  duplicated rule tables invite drift.

## Git state

- `main` at `57dc8af` (Phase 4 commit). All four phase commits pushed:
  `34ddc37` (P1), `28f0398` (P2), `b904a21` (P3), `57dc8af` (P4).
- Working tree clean.
- Latest tag is `v0.7.0`; the follow-up work lives under `Unreleased`.