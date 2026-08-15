# Changelog

All notable changes to Tycoma will be documented in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this
project intends to follow [Semantic Versioning](https://semver.org/) starting from its first tag.

## [Unreleased]

Nothing has shipped yet — the project is in the planning/scaffolding stage. See
`tycoma-admin-dashboard-backlog.md` and `tycoma-admin-dashboard-implementation-sequence.md` for
what's planned for the first tagged release (target: `v0.1.0`, at the end of the Foundation &
Access Control phase).

### Added

- Project scaffold: directory structure (`setup-tycoma.sh`), `package.json` with pinned versions
  (Node 24 LTS, Next.js 16.3, Prisma 7.9.1)
- Decision: password hashing via Argon2id (`@node-rs/argon2`)
- Decision: testing stack — Jest (unit) + Playwright (e2e)
- Decision: hexagonal boundary enforcement via dependency-cruiser
- Planning docs for the Admin Dashboard epic (`tycoma-admin-dashboard-backlog.md`,
  `tycoma-admin-dashboard-implementation-sequence.md`, `tycoma-admin-dashboard-module-spec.md`,
  `tycoma-ai-software-engineer-prompt-admin-dashboard.md`)

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
