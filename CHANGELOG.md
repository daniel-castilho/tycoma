# Changelog

All notable changes to Tycoma will be documented in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this
project intends to follow [Semantic Versioning](https://semver.org/) starting from its first tag.

## [Unreleased]

### Fixed

- **Password-reset token no longer leaks to logs.** The `Mailer` port now receives
  `{ appUrl, token }` instead of a prebuilt `resetUrl`, so each adapter controls URL
  construction. `consoleMailer` logs only the recipient and the reset page path — the raw
  token never reaches stdout (audit finding 1.1). A regression test pins that the token goes
  only to the mailer and never appears in the use-case result (audit finding 1.2). A real
  env-gated SMTP adapter is tracked in `tasks/tycoma-smtp-mailer-backlog.md` (finding 1.3).
- **Mutating admin Server Actions now guard session and audit the actor.** `savePageAction`,
  `saveCategoryAction` and `saveTagAction` call `requireSession()` and pass `session.sub`.
  `createPage`/`updatePage` and `saveCategory`/`saveTag` take an `actorId` and record
  `content.page_created`/`page_updated`, `content.category_created`/`category_updated`,
  `content.tag_created`/`tag_updated` — matching the post/delete paths (audit findings 2.1).
- **Session lifetime has a single source of truth.** `SESSION_TTL_SECONDS` in
  `auth/domain/policies.ts` is consumed by both the JWT issuer and the session cookie;
  a test pins the issued token's lifetime and the cookie `maxAge` to the same constant
  (audit finding 2.2).
- **Edge verifier enforces `AUTH_SECRET` hygiene and fails closed.** The placeholder /
  whitespace / minimum-length rules moved to `src/shared/kernel/secret.ts`
  (`validateAuthSecret`) and are shared by `env.ts` and the Edge `jwt-session-verifier`;
  a weak secret now yields unauthenticated requests instead of silently accepted tokens
  (audit finding 2.3).

## [v0.7.0] — 2026-08-16

Seventh tagged release: **Security Hardening Phase C** — operational excellence and the residual
A/B debt that is still load-bearing. **No new npm dependencies.** CSP enforcement is deliberately
deferred (lesson entry in `docs/lessons.md`); 2FA and sliding/remember-me remain skipped.
See `docs/releases/v0.7.0.md` for the full decision log.

### Added

- **CI security gate.** `.github/workflows/ci.yml` runs `npm audit --omit=dev --audit-level=high`
  right after `npm ci` and fails on critical/high vulnerabilities. Current tree: zero.
- **Dependabot weekly** for the `npm` ecosystem (`.github/dependabot.yml`); patch + minor
  batches, majors stay as individual PRs.
- **Step-up on destructive deletes.** `createDeletePost`, `createDeletePage`, `createDeleteMedia`
  and the bulk-delete branch of `createBulkPosts` all call `StepUpStore.has(actorId)` before
  touching the database. The 10-minute Redis TTL marker from Phase B is reused — no second
  step-up system. A reusable `<StepUpHint />` admin component surfaces the prompt above the
  delete form on `/admin/posts`, `/admin/pages/[id]`, and `/admin/media/[id]`.
- **SigV4 presigned media URLs.** New `MediaAssetWithUrl` shape and `media.listMediaWithUrls()` /
  `media.getMediaWithUrl(id)` use cases route every read through a single TTL constant
  (`SIGNED_URL_TTL_SECONDS = 30 min`). Implementation uses `node:crypto` only — no
  `@aws-sdk/*` direct dependency was added.
- **Backup manifest + checksum.** New `src/shared/backup/manifest.ts` defines the v1 schema
  (metadata + object keys; binaries stay in the bucket) with stable JSON canonicalisation.
  `scripts/backup-roundtrip.mjs` proves the export → SHA-256 → re-import loop without Docker.
- **`/.well-known/security.txt`** (RFC 9116). Rolling one-year `Expires`, generated at request
  time. New `SECURITY_CONTACT` env var (default `admin@example.test` — operator must override
  in production).
- **COOP on `/admin/:path*`.** `Cross-Origin-Opener-Policy: same-origin` is added in
  `next.config.ts`. Public site is unaffected.
- **Documentation.** New `docs/release-runbook.md` (single procedure to follow before tagging);
  `docs/testing-playbook.md` gained a § Security regression block; `docs/releases/v0.7.0.md`
  is the new milestone notes file.

### Changed

- `media` application exposes `listMediaWithUrls` and `getMediaWithUrl`. Callers in the admin
  media library, content-entry editor, and public content-type entry view were updated; raw
  `MediaAsset.url` is no longer rendered directly.
- `deletePost` is a new use case; previously the page-only delete path was exposed.
  Bulk-post delete (the `action: "delete"` branch of `bulkPosts`) now requires step-up too.

### Residual

- **CSP stays Report-Only.** Documented as a Phase C residual in `docs/lessons.md`. Enforcing
  without a nonce pipeline risked breaking the admin or public site; tracked for the next
  milestone.
- **2FA and sliding/remember-me still skipped.** No human approval of a TOTP library yet.

### Changed (post-tag, dev-local tooling)

- `docker-compose.yml` — Mongo and LocalStack now use bind mounts (`./data/mongo`,
  `./data/localstack`) instead of Docker-named volumes. The host paths are visible,
  backup-friendly, and gitignored.
- New `scripts/mongo-dump.mjs` wraps `mongodump` + `tar` and prints a SHA-256; run before
  destructive migrations. Documented in `docs/release-runbook.md` § Backup protocol and
  `docs/lessons.md` (durable rule).
- **No new npm dependencies.** The tag remains `v0.7.0`; no patch tag created.

## [v0.6.0] — 2026-08-16

Sixth tagged release: **Security Hardening Phase B**. Shrinks the session-theft window,
adds step-up re-auth for sensitive actions, broadens rate limiting, and implements a
progressive lockout policy on the login path. **No new npm dependencies.** 2FA is
deliberately deferred (pending human approval of a TOTP library). See
`docs/releases/v0.6.0.md` for details.

### Added

- **Step-up re-auth for `change_password`.** `createStepUp` re-verifies the admin's
  current password and writes a `stepup:{userId}` marker in Redis with a **10-minute TTL**
  (`STEP_UP_TTL_SECONDS`). `changePassword` now requires `StepUpStore.has(userId)` before
  proceeding. The marker is reused (not consumed) so form retries work without re-confirming.
  Admin UI at `/admin/account` exposes a "Confirm current password" form before the
  change-password form, with a hint that reflects whether the step-up is currently active.
- **Rate limit on `POST /api/media`.** 30 / 15 min per `(userId, ip)` pair. Returns
  `429 Too many uploads. Try again in a few minutes.` on excess.
- **Rate limit on `change_password`.** 5 / 15 min per `userId`. Returns a clear Result
  error on excess. Constants exported from the use case for tunability.
- **Progressive lockout.** After **10 failures within 1 hour** for a given
  `(ip, email)` pair, an extended **30-minute block** is applied. New `LockoutStore` port
  + `redisLockoutStore` adapter (`lockfail:{key}` counter + `lockblock:{key}` flag, both
  TTL-bounded). Successful login resets the counter and clears any block.
- **Domain ports.** New `StepUpStore` (`grant` / `has` / `revoke`) and `LockoutStore`
  (`countFailure` / `isBlocked` / `block` / `reset`) ports in `auth/domain`. Adapters live
  in `auth/infrastructure`. Both store impls use the existing Redis client.

### Changed

- **Default session lifetime: `7d` → `12h`.** `SESSION_TTL_SECONDS` and the JWT
  `setExpirationTime("12h")` are aligned. Cookie `maxAge` matches. Any admin logged in
  before the upgrade is silently logged out within at most 12 hours after deploy (intended).
- **`changePassword` use case signature** now takes `StepUpStore` as a 5th argument.
  The `changePassword` Server Action and the new `stepUpAction` Server Action both live in
  `src/app/admin/_actions/account.ts`.
- **`login` use case signature** now takes `LockoutStore` as a 6th argument. The order of
  audit events is unchanged; lockout checks happen before the rate-limit `hit` so a blocked
  key never increments the counter.
- **`account` page** is now `force-dynamic` (was implicit before) so the step-up status
  query at render time always reflects the current Redis marker.

### Deferred (Phase B+)

- **TOTP 2FA** (B19–B25). Pending explicit human approval of a TOTP library. Phase B DoD
  is valid without 2FA.
- **Sliding session / remember-me** (B2, B3). Default short TTL only.
- **Step-up gating on destructive deletes** (delete post/page/media in bulk). Audit
  already exists; the step-up gate can be added later without changing the shape.

### Documentation

- New durable rules in `docs/lessons.md`: session TTL dropped to `12h` (with the
  consequences spelled out), step-up lives in Redis not in the JWT, 2FA deliberately
  deferred — don't sneak it in.
- New planning docs: `tasks/tycoma-security-hardening-phase-b-{backlog,
  implementation-sequence, module-spec}.md` + AI prompt, cleaned from the same fence-block
  issue that affected Phase A.

## [v0.5.0] — 2026-08-16

All notable changes to Tycoma will be documented in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this
project intends to follow [Semantic Versioning](https://semver.org/) starting from its first tag.

## [v0.5.0] — 2026-08-16

Fifth tagged release: **Security Hardening Phase A**. Closes the deferred security
follow-ups by raising the day-one resistance bar against stored XSS and trivial session
abuse — without 2FA, session redesign, or new npm dependencies. See
`docs/releases/v0.5.0.md` for details.

### Added

- **Security response headers** via `next.config.ts` `headers()` (site-wide):
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `X-Frame-Options: DENY`, `Permissions-Policy` (camera/microphone/geolocation disabled),
  and a `Content-Security-Policy-Report-Only` baseline (`default-src 'self'`, `img-src` and
  `connect-src` allow the configured S3 host, `frame-ancestors 'none'`, no `unsafe-eval`).
  `Strict-Transport-Security` is sent only when both `NODE_ENV === 'production'` and
  `APP_URL` is `https://`, so local HTTP dev is not broken.
- **`AUTH_SECRET` production policy** in `src/shared/env.ts`. `parseEnv` requires length
  ≥ 32 in production, rejects documented placeholders, and rejects leading/trailing
  whitespace. Local dev/test keeps the 16-char minimum. `next build` is detected via
  `NEXT_PHASE` so a local build with the placeholder secret still works; the rule bites at
  runtime. `src/shared/env-instance.ts` is the validated singleton; adapters import from
  there.
- **Media upload hardening** in `src/modules/media/application/use-cases/upload-media.ts`:
  10 MiB max size, MIME allowlist (`image/jpeg`, `image/png`, `image/webp`, `image/gif`
  only), magic-byte sniffing that must match the declared type, **SVG blocked by both
  MIME and extension**, and server-generated storage keys (`media/${objectId}.${ext}`).
  The `next/image` SVG allow flag is now `false`.
- **Public-site XSS regression guard** at
  `src/app/(site)/_components/xss-regression.test.ts`: walks the `(site)/` subtree and
  fails if any file references `dangerouslySetInnerHTML` — the entire stored-XSS defence
  for Phase A.
- **`scripts/test-register.mjs`** now seeds `process.env` with safe defaults
  (`AUTH_SECRET`, `DATABASE_URL`, `REDIS_URL`, `NODE_ENV=test`) before any module is
  imported, so tests that transitively pull in adapters (`prisma`, `redis`,
  `session-cookie`) don't crash on `process.env` reads.

### Changed

- **Session cookie** (`src/app/admin/_lib/session-cookie.ts` + `src/app/admin/_actions/auth.ts`):
  attributes already centralised and validated; logout now writes an empty value with
  `maxAge: 0` using the same option object so the browser actually drops the cookie.
  `src/app/admin/_lib/session-cookie.test.ts` asserts the option shape so it cannot
  regress silently.
- **`package.json` `test` script** wraps the `src/**/*.test.ts` glob in single quotes so
  the shell does not pre-expand it (the previous command silently matched only
  `env.test.ts`).
- `.env.example` now comments the production bar for `AUTH_SECRET`.

### Documentation

- `tasks/tycoma-security-hardening-phase-a-{backlog,implementation-sequence,module-spec}.md`
  and `tasks/tycoma-ai-software-engineer-prompt-security-hardening-phase-a.md` are clean
  Markdown (the planning files originally landed wrapped in fenced code blocks; cleaned
  up at the start of the epic).
- New durable rules in `docs/lessons.md`:
  - `next build` forces `NODE_ENV=production` for local builds; detect via `NEXT_PHASE`
    when a boot-time rule must only bite at runtime.
  - Stored XSS is blocked only as long as the public site stays plain text; any future
    HTML mode must come with a human-approved sanitizer library.
- New planning docs section: AGENTS.md `Known technical debt` remains empty (no new
  violations introduced).

## [v0.4.0] — 2026-08-16

All notable changes to Tycoma will be documented in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this
project intends to follow [Semantic Versioning](https://semver.org/) starting from its first tag.

## [v0.4.0] — 2026-08-16

Fourth tagged release: **Media-typed fields** for Custom Content Types. A content type can
now declare a field of kind `media` whose value is the id of an asset uploaded in the media
library. The admin picks one through a `<select>` (with a 50×50 preview), and the public
detail page renders the asset via `next/image` — or a labelled placeholder if the asset has
been deleted. `deleteMedia` now refuses to remove an asset still referenced by a content
entry. See `docs/releases/v0.4.0.md` for details.

### Added

- **Domain — `media` field kind.** `ContentFieldType` gains `"media"`. The coercer accepts
  only 24-character hex strings (delegated to `isObjectId` from `src/shared/db/object-id.ts`),
  so a malformed value is rejected at save time without a repo query. `isContentFieldType`
  recognises the new kind automatically through the `FIELD_COERCERS` registry.
- **Media usage lookup extended to content entries.** `MediaUsageReference` becomes a named
  union with `{ type: "post" | "page" | "entry"; id: string }`. `findUsages` now also
  returns entry ids. `deleteMedia` (which only checks `usages.length > 0`) blocks deletes
  when an entry references the asset — no change to its signature, just more accurate
  coverage.
- **Admin media picker.** `content-entry-form.tsx` renders a `<select>` of the media
  library's image assets when the field kind is `media`. A 50×50 `next/image` preview
  appears when an asset is selected. The form actions pass the raw mediaId string to the
  server action, which flows through `validateEntryFields` unchanged.
- **Public render with placeholder.** `/(site)/types/[type]/[slug]/page.tsx` resolves every
  declared `media` field through `media.getMedia` and hands the view a
  `Map<fieldName, MediaAsset | null>`. The view renders `next/image` when present and a
  `<em>Mídia indisponível</em>` placeholder when the asset is missing — the entry itself
  never `notFound()`s for a missing media asset.

### Changed

- `src/app/_lib/modules.ts` threads the new `findEntryIdsUsingMedia` dep from
  `content/infrastructure` into `createContentUsageLookup`. No change to the public shape of
  `media` or `content` exports.

### Documentation

- New planning docs (`tasks/tycoma-content-types-media-fields-{backlog,module-spec,
  implementation-sequence}.md`) reflect the delivered state and flag MF6 (admin entry-list
  thumbnail column) as deferred.

## [v0.3.1] — 2026-08-16

All notable changes to Tycoma will be documented in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this
project intends to follow [Semantic Versioning](https://semver.org/) starting from its first tag.

## [v0.1.0] — 2026-08-14

First tagged release: the complete Admin Dashboard epic (all five milestones shipped together) plus
resolution of the recorded technical debt. See `docs/releases/v0.1.0.md` for details.

### Added

- Project scaffold: directory structure (`setup-tycoma.sh`), `package.json` with pinned versions
  (Node 24 LTS, Next.js 16.3, Prisma 6.19.3)
- Decision: password hashing via Argon2id (`@node-rs/argon2`)
- Decision: testing stack — Node.js built-in test runner (`node --experimental-strip-types
  --test`), fast unit tests with no Docker; domain tests use no mocks
- Decision: hexagonal boundary enforcement via the rule-1 purity greps + module wiring factories
  (documented in `AGENTS.md`)
- Planning docs for the Admin Dashboard epic (`tycoma-admin-dashboard-backlog.md`,
  `tycoma-admin-dashboard-implementation-sequence.md`, `tycoma-admin-dashboard-module-spec.md`,
  `tycoma-ai-software-engineer-prompt-admin-dashboard.md`)
- **Admin dashboard epic** — all five milestones:
  - Foundation & access control: setup, login, session guard, password recovery, rate limiting,
    profile/change-password.
  - Core content: dashboard KPIs, posts, pages, taxonomy (categories/tags with parent cycle guard).
  - Media: multi-file upload API, S3-compatible storage, grid, metadata, usage-guarded delete.
  - Site structure & SEO: site settings, nested navigation menus, SEO defaults, `/sitemap.xml`.
  - Monitoring: `audit` module with `AuditEventWriter` port threaded through `auth`/`content`/
    `media`, plus a filterable audit log viewer.
- Application-layer tests for the audit, menus and settings use cases (30 tests total).

### Changed

- **Downgraded Prisma to `6.19.3`** (`prisma` + `@prisma/client`). Prisma ORM 7 dropped MongoDB
  support, so the pinned v7 stack could not generate a client. See `docs/lessons.md`.
- Added `postinstall: prisma generate` so a clean `npm ci` produces a working `@prisma/client`
  (Twelve-Factor: reproducible builds).
- Removed unused Tailwind references (`@import "tailwindcss"` in `globals.css`, postcss plugin) —
  no component uses Tailwind classes; the package was never installed.
- Fixed first-ever `npm run build`:
  - `admin-shell.css` import path in the authed layout.
  - `"use server"` action files exported non-function values (`emptyAuthState`, `emptyPostState`);
    moved initial action state to `src/app/admin/_lib/action-state.ts`.
  - Auth pages (`/admin/setup`, `/admin/login`, `/admin/forgot-password`) are now
    `force-dynamic` so the build does not need a running database.
- Enabled `allowImportingTsExtensions` in `tsconfig.json` (Node `strip-types` import style).
- Added `.github/workflows/ci.yml` (lint, typecheck, tests, build on push/PR) and
  `docs/twelve-factor.md` (reference & compliance matrix).
- Wired cross-module ports through a framework composition root (`src/app/_lib/modules.ts`); each
  module's `application/index.ts` exposes a wiring factory that receives cross-module ports.
- Enabled flat ESLint config (`eslint-config-next`, zero warnings) and `next/image` for the S3
  remote host.
- **Migrated password hashing from `bcryptjs` to Argon2id** (`@node-rs/argon2`), fulfilling the
  original decision recorded above. Added a `PasswordHasher` port in `auth/domain/`, an Argon2id
  adapter in `auth/infrastructure/` (OWASP-recommended parameters: 64 MiB, 3 passes, 1 lane;
  version 0x13), and injected it through the auth use-case factories. `verify` treats a malformed
  stored hash as a mismatch instead of throwing.
- **Completed Zod adoption**: `searchParams` on the posts, media and audit-log pages are validated
  with Zod schemas, and all environment configuration is validated at `src/shared/env.ts`
  (`NODE_ENV`, `AUTH_SECRET`, `APP_URL`, `DATABASE_URL`, `REDIS_URL`, `S3_*`). Infrastructure
  adapters read config from the validated `env` object instead of `process.env` directly.

## [v0.2.0] — 2026-08-15

Second tagged release: the complete **Public Site MVP** epic on top of the admin dashboard. See
`docs/releases/v0.2.0.md` for details.

### Added

- Public site (`src/app/(site)/**`) — composition-only anonymous reading experience:
  - Public layout shell driven by site settings (title, description, logo) + navigation menu
    (nested items; `main` slug, fallback to first menu) with a scoped light theme.
  - Home `/` listing published posts (newest first) with date and excerpt; empty state.
  - Post detail `/posts/[slug]` — published-only, `generateMetadata` (meta title/description,
    canonical, `ogImage`), featured image via `next/image`.
  - Page detail `/[slug]` (top-level, matching `/sitemap.xml`) — published-only, same metadata.
  - Category/tag index pages (`/categories`, `/tags`) with post counts, and detail pages listing
    published posts.
  - Friendly `not-found` for missing/unpublished slugs; drafts never leak.
- Public read use cases in the `content` module (`application/use-cases/public.ts`): published
  post/page by slug, list published posts/pages, posts by category/tag, and a public-nav resolver
  that maps menu items to public hrefs (published-only, skipping unresolvable refs).

### Changed

- `ListPostsQuery` gained a `tagId` filter, implemented in the Prisma post adapter.
- README "Current state" promoted to `v0.2.0`; the previously recorded technical debt notes were
  removed (both items were resolved in `v0.1.0` and the section was stale).
- Planning docs for the Public Site epic
  (`tycoma-public-site-backlog.md`, `tycoma-public-site-implementation-sequence.md`,
  `tycoma-public-site-module-spec.md`, `tycoma-ai-software-engineer-prompt-public-site.md`) are
  marked shipped and reflect the delivered state.

## [v0.3.0] — 2026-08-15

Third tagged release: the **Custom Content Types** epic. The admin can now define content types
with a fixed field set, manage entries for them, and render published entries on the public
site — without leaving the existing hexagonal `content` module. See
`docs/releases/v0.3.0.md` for details.

### Added

- **Custom content types** (`ContentType` + `ContentEntry` Prisma models, domain entities in
  `src/modules/content/domain/content-types.ts`):
  - **Definitions**: name, slug (`@unique`), description, JSON `fields` list (text, longtext,
    number, boolean, date — each with `name`, `label`, `required`). A field-coercer registry
    (`FIELD_COERCERS` in `content-type-fields.ts`) gives one strategy per kind; unknown field
    names are dropped, required fields are enforced.
  - **Entries**: per-type slug, title, status (`draft`/`scheduled`/`published`), `publishedAt`,
    `scheduledAt`, JSON `fields` validated against the type definition. Unique per
    `(contentTypeId, slug)`.
  - **Admin UI** at `/admin/content-types`: list, new/edit type (dynamic field editor with
    add/remove rows), entries list/new/edit per type, publish + delete actions. Server Actions
    in `src/app/admin/_actions/content-types.ts` with Zod-validated form payloads.
  - **Public reading** at `/types/[type]` (index of published entries) and
    `/types/[type]/[slug]` (detail) with `generateMetadata`, canonical URL, and a generic field
    renderer (`text`, `longtext`, `number`, `boolean`, `date`). Drafts and missing slugs hit
    `notFound()`.
- **Use cases** in the `content` module (`application/use-cases/content-types.ts`): list/get/save/
  delete content types, list/get/create/update/publish/delete entries, plus two public reads
  (`listPublishedEntriesByTypeSlug`, `getPublishedEntryByTypeAndSlug`). Audit events recorded
  for every mutation through the existing `AuditEventWriter` port.
- **Repository ports** (`ContentTypeRepository`, `ContentEntryReader` / `ContentEntryWriter`)
  split per ISP convention; Prisma adapter with explicit `toDomain` / `toPersistence` mappers.
- **Application tests** for every new use case (mocks the ports only).

### Changed

- `src/app/admin/(authed)/_components/admin-shell.css` gained shared `.field-set`,
  `.field-row`, `.checkbox-inline`, and `.btn-sm` styles reused by the content-type forms.
- The admin sidebar (`src/app/admin/(authed)/layout.tsx`) now lists **Content types** between
  Taxonomy and Media.

### Documentation

- New planning docs (`tasks/tycoma-content-types-backlog.md`,
  `tasks/tycoma-content-types-implementation-sequence.md`,
  `tasks/tycoma-content-types-module-spec.md`) reflect the delivered state.
- New `docs/testing-playbook.md` consolidates the testing pyramid, port-mocking patterns,
  regression checklist, and smoke-test guidance that were previously implicit.

## [v0.3.1] — 2026-08-16

Patch release on top of `v0.3.0`. No runtime changes — only a clean `package-lock.json` so
`npm ci` resolves every transitive entry, plus the durable **lockfile rule** learned while
recovering CI. See `docs/releases/v0.3.1.md` for details.

### Changed

- **Lockfile refresh** (`07e8a41`): regenerated `package-lock.json` from a clean
  `node_modules` so `npm ci` no longer rejects with `Missing: @emnapi/runtime@1.11.3 from
  lock file` (and the matching `@emnapi/core`). The lockfile was stale relative to the
  dep graph grown by the `v0.3.0` Prisma models and Next.js wasm32 optionals.
- **Lockfile rule** (`e8177be`): `AGENTS.md` § *Critical rules* (rule 10) and
  `docs/lessons.md` require every `npm install` that mutates the lockfile to commit the
  updated `package-lock.json` in the same change set. Local sanity check:
  `rm -rf node_modules && npm ci`.

## [v0.2.1] — 2026-08-15

Follow-up release on top of `v0.2.0`. Closes the deferred follow-ups from the public-site epic
(P3, P6, P9, P14), tightens CI, and adds the **doc-sync** rule that requires every milestone
to keep the five documentation surfaces in step. See `docs/releases/v0.2.1.md` for details.

### Added

- **Public posts index** at `/posts`: full list of published posts (newest first) with metadata
  (title from SEO defaults, canonical URL). Closes the deferred follow-up P6 from the public-site
  backlog.
- **Page hierarchy breadcrumb** on public page detail (`/[slug]`): rendered from a new
  `content.getPageBreadcrumb` use case that walks `parentId` (cycle-guarded) and shows only
  published ancestors. Closes the deferred follow-up P9.
- **Public-site `SiteHeader` / `SiteFooter` / `PostCard` components** under `src/app/(site)/_components`,
  replacing the inline JSX in the layout/home/posts routes. Closes the deferred follow-up P3.
- **Public favicon from settings**: when `settings.faviconMediaId` resolves to a media asset, the
  public layout's `generateMetadata` exposes it via the `icons.icon` field. Closes the deferred
  follow-up P14.
- **CI hardening**: `.github/workflows/ci.yml` now publishes the Next.js build before running
  tests, so the same `next build` invocation the gate runs is exercised end-to-end.
- **Application tests**: login, password-reset, and content-guard paths are now covered by unit
  tests in `src/modules/auth/application/use-cases/{login,password-reset}.test.ts` and
  `src/modules/content/application/use-cases/content-guards.test.ts` (domain ports mocked only).
- **Doc sync rule**: `AGENTS.md` § *Critical rules* (rule 9) and `docs/coding-standards.md` §
  *Doc sync* now require the five-file checklist (README Current State, CHANGELOG, tasks/*,
  AGENTS.md Known technical debt, docs/lessons.md when a durable rule is learned) as part of
  every milestone-sized change.
- **Testing playbook**: `docs/testing-playbook.md` consolidates the testing pyramid,
  port-mocking patterns, regression checklist, and smoke-test guidance that were previously
  implicit.

### Changed

- `src/app/(site)/layout.tsx` is now `force-dynamic` (matches the admin auth pages and
  `/sitemap.xml`) so `next build` does not need a running database or environment secrets.
- README documentation table now links the release notes, AI-prompt task files, and the new
  testing playbook.

---

_Add a high-level entry here before every tag, per the **Releases** section of `AGENTS.md`._
_Add entries under `[Unreleased]` for follow-up work that has landed on `main` but is not yet
tagged — promote the section to a dated `[v0.X.0]` entry when the next tag is created._
