# Changelog

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

## [Unreleased]

Follow-up work on top of `v0.2.0`. Will become the next tag (`v0.3.0` or similar) once a
milestone-sized epic lands.

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

### Changed

- `src/app/(site)/layout.tsx` is now `force-dynamic` (matches the admin auth pages and
  `/sitemap.xml`) so `next build` does not need a running database or environment secrets.

---

_Add a high-level entry here before every tag, per the **Releases** section of `AGENTS.md`._
_Add entries under `[Unreleased]` for follow-up work that has landed on `main` but is not yet
tagged — promote the section to a dated `[v0.X.0]` entry when the next tag is created._
