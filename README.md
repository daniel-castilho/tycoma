# Tycoma — Tyny Content Manager

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-24-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Single-tenant CMS with a single administrator, built as a **modular monolith** with **hexagonal
architecture** (ports & adapters). Each business module is self-contained enough to be extracted
into a service later with minimal impact.

## Table of Contents

- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Requirements](#requirements)
- [Getting started](#getting-started)
- [Commands](#commands)
- [Testing](#testing)
- [Current state](#current-state)
- [Roadmap](#roadmap)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict)
- **Prisma 6** + **MongoDB** (replica set — required for transactions). Pinned to 6.x because Prisma
  ORM 7 dropped MongoDB support (no `@prisma/adapter-mongodb` exists yet).
- **Redis** (`ioredis`) — rate limiting, cache
- **jose** — JWT sessions (httpOnly cookie)
- **@node-rs/argon2** — Argon2id password hashing
- **zod** — input validation
- **Node.js 24.x**

## Architecture

Every business module under `src/modules/<feature>/` follows the same layout:

```
src/modules/<feature>/
├── domain/           Entities, value objects & outbound port interfaces (zero framework imports)
├── application/      Use-case implementations (pure TypeScript, depend only on domain ports)
│   ├── use-cases/    create<UseCase>(ports) factories returning closures
│   ├── index.ts      Composition root: wires infrastructure adapters into the use cases
│   └── edge.ts       Optional edge-safe entrypoint (no Prisma/ioredis) for the Next.js proxy
└── infrastructure/   Adapters: Prisma repositories, Redis, JWT, Argon2id, S3, mailers + mappers
```

| Area      | Responsibility                                                                   |
| --------- | -------------------------------------------------------------------------------- |
| `auth`    | Single-admin auth: setup, login, session (JWT cookie), password recovery, rate limiting, profile |
| `content` | Posts, pages, categories, tags, site settings, navigation menus, SEO defaults, dashboard KPIs |
| `media`   | Media library: upload, S3-compatible storage, metadata, usage lookups            |
| `shared`  | Cross-cutting kernel (`result`, `slug`) + framework glue (Prisma, Redis clients) |
| `app`     | Next.js App Router composition root: admin backoffice (`/admin/**`) + public site (`/(site)/**`); `src/proxy.ts` guards admin routes |

**Boundary rules:**

- `domain/` and `application/` never import framework or infrastructure code.
- Modules depend on each other **only** through `domain/` port interfaces.
- No direct Prisma / Redis / JWT / Argon2 usage outside `infrastructure/`.

## Requirements

- Node.js 24.x
- Docker — MongoDB (replica set), Redis and LocalStack (S3) are defined in `docker-compose.yml`

## Getting started

```bash
cp .env.example .env   # set AUTH_SECRET, and S3_* credentials as needed
npm install
npm run docker:up      # MongoDB (replica set) + Redis + LocalStack S3
npm run prisma:generate
npm run prisma:push    # sync schema to MongoDB (dev only)
npm run dev
```

Open <http://localhost:3000/admin/setup> to create the first (and only) admin account, then log in
at `/admin/login`.

## Commands

| Purpose                          | Command                                     |
| -------------------------------- | ------------------------------------------- |
| Dev server                       | `npm run dev`                               |
| Production build                 | `npm run build`                             |
| Start production                 | `npm run start`                             |
| Lint                             | `npm run lint`                              |
| Type-check                       | `npm run typecheck`                         |
| Unit tests (fast, no Docker)     | `npm test`                                  |
| Docker services (Mongo/Redis/S3) | `npm run docker:up` / `npm run docker:down` |
| Prisma generate                  | `npm run prisma:generate`                   |
| Prisma push (dev only)           | `npm run prisma:push`                       |
| Prisma Studio                    | `npm run prisma:studio`                     |

## Testing

`npm test` runs the Node.js built-in test runner
(`node --import ./scripts/test-register.mjs --experimental-strip-types --test src/**/*.test.ts`).
The custom resolver registers the `@/*` path alias declared in `tsconfig.json` so application
imports stay clean. Domain tests use no mocks; application tests mock the domain ports only.
After significant changes run `npm run build` and smoke-test against `npm run docker:up`.
Full testing guidance: [docs/testing-playbook.md](docs/testing-playbook.md).

## Current state

**Latest tagged release: `v0.7.0`** (Security Hardening Phase C, 2026-08-16) · development continues
on `main` (architecture audit Phases 5–7 shipped post-tag). See [CHANGELOG.md](CHANGELOG.md) and
[docs/releases/](docs/releases/) for the full per-version history.

The product surface is complete end-to-end:

- **Admin Dashboard** (`/admin/**`) — setup/login, session guard, password recovery, rate limiting,
  profile & change-password; content management (posts, pages, categories, tags, menus, site
  settings, SEO defaults, dashboard KPIs); media library (S3-compatible upload, metadata, usage
  guard); audit log with filters.
- **Public Site** (`/(site)/**`) — layout shell driven by settings + menus, post/page/category/tag
  listing and detail, published-only reads, SEO metadata (`generateMetadata`, canonical URLs,
  `ogImage`), `/sitemap.xml`, friendly 404s.
- **Custom Content Types** — admin-defined types with typed fields; entries with create/edit/
  publish/delete; public read routes at `/types/[type]` and `/types/[type]/[slug]`.

Security hardening is applied in three shipped phases (A → B → C):

- **Phase A** — security headers (`nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`,
  `Permissions-Policy`, CSP Report-Only), `AUTH_SECRET` policy, explicit session-cookie attributes,
  media upload hardening (10 MiB, MIME + magic-byte allowlist, SVG blocked), stored-XSS defence.
- **Phase B** — 12h session lifetime, step-up re-auth for `change_password`, rate limits on media
  upload and password change, progressive login lockout.
- **Phase C** — CI security gate (`npm audit` at `high`, zero in the current tree), weekly
  Dependabot, step-up on destructive deletes, SigV4 presigned media URLs, backup manifest +
  checksum, `/.well-known/security.txt` (RFC 9116), COOP on `/admin/**`.

An **architecture audit** (Phases 5–7, on `main`) tightened the hexagonal boundaries: repository
ports split into `*Reader`/`*Writer` pairs (ISP), `node:crypto` behind a `TokenHasher` port,
throwing mappers replacing silent `as`-casts, policy defaults lifted into `domain/policies.ts`,
and status validation made strict. Known technical debt is tracked in `AGENTS.md`; remaining
follow-ups (CSP enforcement, 2FA, sliding/remember-me session) are listed in the Roadmap.

## Roadmap

The original implementation sequence planned the Admin Dashboard as separate milestones; in
practice all five phases shipped together as **`v0.1.0`**, followed by the Public Site MVP
(`v0.2.0`), Custom Content Types (`v0.3.0`), and the three Security Hardening phases
(`v0.5.0` → `v0.7.0`).

Deliberately deferred: block-based editor, Markdown rendering on the public site, public headless
API, webhooks, comments, 301 redirects, revision history, automated backup/export scheduling,
multi-user roles, **2FA TOTP** with a human-approved library, **sliding session / refresh
redesign**, **CSP enforce pipeline**, **real LocalStack-backed backup drill run by CI**.

## Documentation

| Document                                                                     | Purpose                                                       |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [AGENTS.md](AGENTS.md)                                                       | Rules for AI agents and human contributors                    |
| [CHANGELOG.md](CHANGELOG.md)                                                 | High-level release index (Keep a Changelog)                   |
| [docs/lessons.md](docs/lessons.md)                                           | Durable lessons learned                                       |
| [docs/coding-standards.md](docs/coding-standards.md)                         | Day-to-day coding standards (TypeScript/Next.js/Prisma)       |
| [docs/testing-playbook.md](docs/testing-playbook.md)                         | Testing pyramid, patterns, regression checklist & smoke        |
| [docs/twelve-factor.md](docs/twelve-factor.md)                               | Twelve-Factor App reference & compliance matrix               |
| [docs/release-runbook.md](docs/release-runbook.md)                           | Pre-tag procedure: gates, smoke, doc sync, human-only tag       |
| [docs/releases/](docs/releases/)                                             | Per-version release notes (v0.1.0 → v0.7.0)                   |
| [tasks/](tasks/)                                                             | Epic backlogs, module specs & implementation sequences         |

## Contributing

Tycoma is developed solo/AI-assisted. Before contributing, read [AGENTS.md](AGENTS.md) (binding
rules — architecture boundaries, English-only, no unapproved dependencies, doc sync) and the
[coding standards](docs/coding-standards.md). Keep the fast test loop green (`npm test`) and sync
the five documentation surfaces (`README.md`, `CHANGELOG.md`, `tasks/*`, `AGENTS.md`,
`docs/lessons.md`) in the same change set (AGENTS.md rule 9).

## License

[MIT](LICENSE) © 2026 Daniel Castilho (https://tyny.ca).
