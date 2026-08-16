# Changelog

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
