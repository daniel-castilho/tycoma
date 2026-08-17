# Architecture Audit — Action Plan

**Document status:** Draft — audit findings reviewed; fixes not started.

**Companion documents:**
`tycoma-admin-dashboard-module-spec.md` ·
`tycoma-content-types-module-spec.md` ·
`docs/coding-standards.md` ·
`docs/lessons.md`

**Goal:** Close the architecture-audit findings (Hexagonal, Clean Code, SOLID, Twelve-Factor)
in severity order. Fixes must keep the AGENTS.md purity rules intact (zero framework imports in
`domain/`/`application/`; adapters implement domain ports; `env` singleton; English only).

**Gates before each batch ships:** `npm test` (currently 142 passing), `npm run lint`,
`npm run typecheck`, `npm run build`. After milestone-sized work, run the doc-sync checklist
(AGENTS.md rule 9).

---

## Phase 1 — Security criticals (do first)

- [x] **1.1** — Never log the raw reset token. `Mailer` port now receives `{ appUrl, token }` and
  `consoleMailer` logs only `to` plus the reset page path — the token never reaches stdout.
  Files: `src/modules/auth/domain/mailer.ts`, `src/modules/auth/infrastructure/console-mailer.ts`,
  `src/modules/auth/application/use-cases/request-password-reset.ts`.
- [x] **1.2** — Confirmed: the use case returns only `ok({ sent: true })` or a generic error —
  no token in responses. Added a regression test pinning that the token goes only to the mailer
  and never appears in the use-case result. File:
  `src/modules/auth/application/use-cases/password-reset.test.ts`.
- [x] **1.3** — Logged the env-gated SMTP mailer as `tasks/tycoma-smtp-mailer-backlog.md`.

## Phase 2 — Authentication gaps

- [x] **2.1** — `savePageAction`/`saveCategoryAction`/`saveTagAction` now call `requireSession()`
  and forward `session.sub`. Page `createPage`/`updatePage` and taxonomy
  `saveCategory`/`saveTag` take an `actorId` and record `content.page_created`/`page_updated`,
  `content.category_created`/`category_updated`, `content.tag_created`/`tag_updated`. New tests:
  `pages.test.ts`, `taxonomy.test.ts`.
- [x] **2.2** — `SESSION_TTL_SECONDS` is canonical in `auth/domain/policies.ts`; the JWT issuer
  and the session cookie both consume it. New `jwt-session-issuer.test.ts` pins the token
  lifetime; `session-cookie.test.ts` pins `maxAge`.
- [x] **2.3** — `validateAuthSecret(raw, { isProduction })` in `src/shared/kernel/secret.ts` holds
  the AUTH_SECRET rules (missing, whitespace, placeholders, 16/32 min). `env.ts` delegates to it;
  the edge verifier validates through it and fails closed (returns `null` → proxy redirects to
  login). Tests: `secret.test.ts`, `jwt-session-verifier.test.ts`.

## Phase 3 — S3 presigned URLs (broken in dev)

- [x] **3.1** — `buildSignedUrl` moved to pure `s3-presign.ts` (`parseEndpoint`,
  `resolveTarget`, `buildSignedUrl`); URL scheme derives from `S3_ENDPOINT` (https fallback
  only when missing), never hardcoded. Tests in `s3-presign.test.ts`.
- [x] **3.2** — `S3_FORCE_PATH_STYLE` honored everywhere (put/delete/ensureBucket/presign) via
  one `resolveTarget`; path-style for LocalStack, virtual-host for real S3; presign signs the
  same host/path shape the adapter addresses. New unit tests pin scheme, addressing, TTL,
  `X-Amz-Signature`; no regression in mocked `media.test.ts`.
  Files: `src/modules/media/infrastructure/s3-presign.ts`,
  `src/modules/media/infrastructure/s3-object-storage.ts`, `s3-presign.test.ts`.

## Phase 4 — Domain correctness

- [x] **4.1** — Media usage detection moved to the domain: pure
  `containsMediaReference(fields, fieldDefs, mediaId)` in
  `src/modules/content/domain/media-reference.ts` (schema-aware Option B: only declared media
  fields, recursive inside the field value; text containing the same hex does not count).
  `findEntryIdsUsingMedia` now loads content-type field defs and delegates to it. Unit tests:
  `media-reference.test.ts`.
- [x] **4.2** — `PostWriter`/`PageWriter.create` now accept `PostWrite`/`PageWrite` instead of
  the full entity. Use cases pass write models (no `id`, no caller timestamps); the adapter
  persists only write fields and no longer strips `id` — Prisma owns
  `id`/`createdAt`/`updatedAt`. Files: `src/modules/content/domain/types.ts`,
  `src/modules/content/infrastructure/prisma-content-repositories.ts`,
  `src/modules/content/application/use-cases/posts.ts`, `pages.ts`.

## Phase 5 — Layer & composition

- [x] **5.1** — Route the media upload rate limit through a `media` domain port/application
  service instead of `getRedis()` + hardcoded constants in the route. File:
  `src/app/api/media/route.ts:3,13-14`.

## Phase 6 — Technical debt (backlog)

- [ ] **6.1** — Strict `z.enum` for status (no silently-degrading `preprocess`); domain already
  throws. Files: `src/app/admin/_actions/content.ts:10-13`,
  `src/app/admin/_actions/content-types.ts:40-43`.
- [ ] **6.2** — Move `newPassword === confirmPassword` check into the `changePassword` use case.
  File: `src/app/admin/_actions/account.ts:69-71`.
- [ ] **6.3** — Apply the dead `q`/`type` filters on the media library page. File:
  `src/app/admin/(authed)/media/page.tsx`.
- [ ] **6.4** — `countByStatus` must resolve statuses via `parseContentStatus`. Files:
  `src/modules/content/infrastructure/prisma-content-repositories.ts:100-103,155-158`.
- [ ] **6.5** — Explicit `toDomain` mappers: `mapUser` no-op, `prisma-media-repository`,
  `prisma-password-reset-token-repository`.
- [ ] **6.6** — Lift policy defaults (pagination limit, sort, Argon2 params) into
  `domain/policies.ts`.
- [ ] **6.7** — `SessionIssuer` should not duplicate `SessionVerifier` (single verify surface).

## Phase 7 — Close-out (doc sync, AGENTS.md rule 9)

- [ ] **7.1** — Update `README.md` (Current State), `CHANGELOG.md`, relevant `tasks/*` statuses,
  `AGENTS.md` (Known technical debt), and `docs/lessons.md`.
- [ ] **7.2** — Full gate pass: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.