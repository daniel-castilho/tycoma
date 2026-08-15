# Tycoma — Tyny Content Manager

Single-tenant CMS with a single administrator, built as a **modular monolith** with **hexagonal
architecture** (ports & adapters). Each business module is self-contained enough to be extracted
into a service later with minimal impact.

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict)
- **Prisma 6** + **MongoDB** (replica set — required for transactions). Pinned to 6.x because Prisma
  ORM 7 dropped MongoDB support (no `@prisma/adapter-mongodb` exists yet).
- **Redis** (`ioredis`) — rate limiting, cache
- **jose** — JWT sessions (httpOnly cookie)
- **bcryptjs** — password hashing
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
└── infrastructure/   Adapters: Prisma repositories, Redis, JWT, bcrypt, S3, mailers + mappers
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
- No direct Prisma / Redis / JWT / bcrypt usage outside `infrastructure/`.

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
(`node --experimental-strip-types --test src/modules/**/*.test.ts`). Domain tests use no mocks;
application tests mock the domain ports only. After significant changes run `npm run build` and
smoke-test against `npm run docker:up`.

## Current state

No tagged release yet. Implementation is in progress against
`tasks/tycoma-admin-dashboard-implementation-sequence.md`:

- **Phase 1 — Foundation & access control:** implemented. Setup, login, session guard
  (`src/proxy.ts`), password recovery, rate limiting, profile/change-password.
- **Phase 2 — Core content management:** largely implemented. Dashboard KPIs, posts, pages,
  taxonomy (categories/tags). Settings & menu use cases exist; their admin screens are pending.
- **Phase 3 — Media:** scaffolding only. Domain types plus storage/repository adapters exist; the
  admin media library UI is pending.
- **Phases 4–5 — Site structure/SEO and Monitoring:** schema models in place (`Setting`, `Menu`,
  `MenuItem`, `AuditEvent`); use cases pending.

> **Known technical debt:** `auth` use-cases import `bcryptjs` directly and should be migrated to
> Argon2id (via a `PasswordHasher` port), and Zod is not yet used for input validation. See "Known
> technical debt" in `AGENTS.md`. Both are backlogged and must be resolved before the `v0.1.0` tag.

## Roadmap

Per the implementation sequence: `v0.1.0` (Phase 1) → `v0.2.0` (Phase 2) → `v0.3.0` (Media) →
`v0.4.0` (Site structure & SEO) → `v0.5.0` (Monitoring). Deliberately deferred: custom content
types, block-based editor, public headless API, webhooks, comments, 301 redirects, revision
history, automated backup/export scheduling, multi-user roles.

## Documentation

| Document                                                                     | Purpose                                                       |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [AGENTS.md](AGENTS.md)                                                       | Rules for AI agents and human contributors                    |
| [docs/lessons.md](docs/lessons.md)                                           | Durable lessons learned                                       |
| [docs/coding-standards.md](docs/coding-standards.md)                         | Day-to-day coding standards (TypeScript/Next.js/Prisma)       |
| [docs/twelve-factor.md](docs/twelve-factor.md)                               | Twelve-Factor App reference & compliance matrix               |
| [tasks/tycoma-admin-dashboard-backlog.md](tasks/tycoma-admin-dashboard-backlog.md) | Admin Dashboard epic — stories & scope                 |
| [tasks/tycoma-admin-dashboard-implementation-sequence.md](tasks/tycoma-admin-dashboard-implementation-sequence.md) | Admin Dashboard epic — delivery order & DoD |
| [tasks/tycoma-admin-dashboard-module-spec.md](tasks/tycoma-admin-dashboard-module-spec.md) | Admin Dashboard epic — target technical design |
| [CHANGELOG.md](CHANGELOG.md)                                                 | High-level release index                                      |