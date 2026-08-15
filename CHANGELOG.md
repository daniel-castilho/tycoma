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

---

_Add a high-level entry here before every tag, per the **Releases** section of `AGENTS.md`._
