# AGENTS.md

Single-tenant CMS ("Tyny Content Manager") built as a **modular monolith** with **Next.js 16
(App Router) + React 19 + TypeScript (strict)**, hexagonal architecture (ports & adapters).
Node.js 24.x.

Sources of truth: `README.md`, `docs/lessons.md`, `docs/coding-standards.md`, and `tasks/*`.
Re-read the relevant parts before starting any task.

## Critical rules (never violate)

1. `domain/` and `application/` have **zero framework / infrastructure imports** (`next/*`,
   `@prisma/client`, `ioredis`, `jose`, React, persistence Zod schemas, etc.).
   Verify before finishing:
   `grep -rEn "^(import|export) .*\b(next/|@prisma|ioredis|jose|react)" src/modules/*/domain src/modules/*/application`
   must return nothing (matches real imports only, not comments). The only exceptions are a module's composition entrypoints
   (`application/index.ts`, `application/edge.ts`), which wire up its own adapters.
2. Cross-module dependencies only through `domain/` port interfaces. **Never** import another
   module's `application` or `infrastructure`.
3. **Zero direct Prisma / Redis / JWT / Argon2 usage outside `infrastructure/`.** Every operation
   goes through a domain port implemented by an adapter, injected into a use-case factory.
4. Passwords only as **Argon2id** hashes (via the auth module's `PasswordHasher` port). Password-reset tokens are stored hashed,
   never in plaintext. Never commit secrets, `.env` files, or real credentials.
5. Do **not** add a new npm dependency without explicit human approval.
6. **English only.** All identifiers, comments, JSDoc/TSDoc, commit messages, documentation and
   log messages must be in English.
7. Server Components by default. `"use client"` only when strictly required (interactivity or
   browser APIs). Never leak server-only code (Prisma, Redis, secrets, Node APIs) into Client
   Components.
8. Every `/admin/**` route except the public auth routes (`/admin/login`,
   `/admin/forgot-password`, `/admin/reset-password`, and `/admin/setup` while no user exists)
   must be covered by the session guard in `src/proxy.ts`. Verify `src/app/admin/_lib/auth-routes.ts`
   and the matcher before adding any new admin route.
9. **Doc sync is part of Done.** After milestone-sized work — an epic phase, a public
   behaviour change, a debt resolution, or a stack pin — the same change set or the immediate
   follow-up commit MUST update all five of:
   1. `README.md` → "Current State"
   2. `CHANGELOG.md` (entry under the next version or `Unreleased`)
   3. The relevant `tasks/*` statuses
   4. `AGENTS.md` → "Known technical debt" (add or clear)
   5. `docs/lessons.md` only if a durable rule was learned

   Do **not** claim work DONE while any of those files still describes the previous milestone as
   current. See `docs/coding-standards.md` § _Doc sync_ for the short bullet list.

## Commands

| Purpose                          | Command                                     |
| -------------------------------- | ------------------------------------------- |
| Install dependencies             | `npm install`                               |
| Dev server                       | `npm run dev` → http://localhost:3000       |
| Production build                 | `npm run build`                             |
| Start production                 | `npm run start`                             |
| Lint                             | `npm run lint`                              |
| Type-check                       | `npm run typecheck`                         |
| Unit tests (fast, no Docker)     | `npm test`                                  |
| Docker services (Mongo/Redis/S3) | `npm run docker:up` / `npm run docker:down` |
| Prisma generate                  | `npm run prisma:generate`                   |
| Prisma push (dev only)           | `npm run prisma:push`                       |
| Prisma Studio                    | `npm run prisma:studio`                     |

> Prefer the fast unit-test loop (`npm test`); it needs no Docker.
> After any `prisma/schema.prisma` change run `npm run prisma:generate` (and `npm run prisma:push`
> locally) before building or testing.
> MongoDB runs as a **replica set** (`rs0` in `docker-compose.yml`) because Prisma transactions
> require it — always use `npm run docker:up`, never a bare `mongo` container.
> Prisma is pinned to **6.x** — Prisma ORM 7 does not support MongoDB. Do not bump to 7 until
> MongoDB support ships (see `docs/lessons.md`).

## Architecture

Every business module follows the same folder structure under `src/modules/<feature>`:

```
domain/          Entities, value objects & outbound port interfaces — zero framework imports
application/     Use-case implementations (pure TypeScript, depend only on domain ports)
  use-cases/     create<UseCase>(ports) factories returning closures
  index.ts       Composition root: wires infrastructure adapters into the use cases
  edge.ts        Optional edge-safe entrypoint (no Prisma/ioredis) for the Next.js proxy
infrastructure/  Adapters: Prisma repositories, Redis, JWT, bcrypt, S3, mailers + mappers
```

- `src/modules/auth` — single-admin authentication: setup, login, session (JWT httpOnly cookie),
  password recovery, rate limiting, profile.
- `src/modules/content` — posts, pages, categories, tags, site settings, navigation menus, SEO
  defaults, dashboard KPIs.
- `src/modules/media` — media library: upload, S3-compatible storage, metadata, usage lookups.
- `src/shared/` — pure cross-cutting kernel (`kernel/result.ts`, `kernel/slug.ts`) plus framework
  glue (`db/prisma.ts`, `cache/redis.ts`). No feature knowledge.
- `src/app/` — Next.js App Router composition root only: admin backoffice (`/admin/**`), public
  site (`/(site)/**`), API. `src/proxy.ts` guards admin routes.
- `src/app/_lib/modules.ts` — framework composition root. Cross-module ports are wired here (e.g.
  the audit writer injected into `auth`, `content`, `media`). Modules expose wiring factories
  (`create<Module>Application(ports)`) and **never** import another module's `application` or
  `infrastructure`.
- Modules are ready for a future split into services; keep boundaries clean.

## Conventions

- TypeScript strict mode, 2-space indent, no tabs, ~100–120 columns, no wildcard imports.
- Import order: Node built-ins → external packages → internal (`@/` alias) → relative.
- Naming: files kebab-case; components `PascalCase.tsx`; classes/types/interfaces `PascalCase`;
  functions/hooks `camelCase`; constants `UPPER_SNAKE_CASE`; tests `*.test.ts`; routes kebab-case
  folders.
- Use-case factories: `createLogin(repo, issuer, limiter)` returning `async (...args) =>
Result<...>`. Errors as `Result<T, E>` (`@/shared/kernel/result`) or domain exceptions — never
  let an invalid entity exist.
- Port interfaces live in `domain/` next to the types they serve (e.g. `domain/user.ts` exports
  `User` + `UserRepository`).
- Adapters: explicit `toDomain()` / `toPersistence()` mappers in `infrastructure/`.
- Zod for every external input (forms, query params, API bodies, env); infer types with `z.infer`.
  Keep schemas next to the adapter/action that consumes the data.
- **UI**: thin Server Components / Server Actions. Business rules never live in `.tsx` or Server
  Actions — compose application services only.
- Follow the [Twelve-Factor App](docs/twelve-factor.md) methodology: env-driven config (never
  hardcode environment-specific values), reproducible builds from the lockfile, backing services as
  attached resources, and schema changes shipped with the release.

## Testing

- Node.js built-in test runner: `npm test`
  (`node --experimental-strip-types --test src/**/*.test.ts`).
- Test names: `method_condition_expectedResult` or descriptive `it("should …")`.
- Domain unit tests: **no mocks** — pure entities/value objects.
- Application tests: mock the domain ports only.
- After significant changes run `npm run build` + a smoke test against `npm run docker:up`.
- Testing details: `docs/testing-playbook.md` (pyramid, patterns, regression checklist, smoke).

## Releases

- Create an annotated Git tag **only** when a milestone (a phase in
  `tasks/tycoma-admin-dashboard-implementation-sequence.md`) meets its Definition of Done.
- Before tagging:
  1. Create `docs/releases/v0.X.0.md` (reuse the latest one as template).
  2. Add a high-level entry to `CHANGELOG.md`.
  3. Update the "Current State" section in `README.md`.
  4. Promote any durable lesson to `docs/lessons.md`.
- Tag command:
  `git tag -a v0.X.0 -m "v0.X.0 — <short title>"`

## Known technical debt (resolve later)

Items that currently violate the rules above. Do **not** silently "fix" them, and do **not** add
new violations — flag them to the human instead.

- _None at the moment._ The two items carried over from `v0.1.0` (`asStatus` silent degradation
  and the wide repository interfaces) were resolved:
  - `asStatus` was replaced by `parseContentStatus` in
    `src/modules/content/domain/content-status.ts`, which throws on unknown values (covered by
    `content-status.test.ts`). The Prisma adapter now calls it from `mapPost`/`mapPage`.
  - `PostRepository`, `PageRepository` and `MenuRepository` in
    `src/modules/content/domain/types.ts` were split into `*Reader` / `*Writer` pairs (same
    shape as `AuditEventStore` + `AuditEventReader`). The use cases now depend only on the
    fatia they actually use, the adapter still satisfies the union, and `src/app/_lib/modules.ts`
    was left untouched because the wired objects already expose the same surface.

The previously recorded items were resolved in `v0.1.0`:

- `bcryptjs` direct imports in `auth` use-cases migrated to an Argon2id `PasswordHasher` port.
- Zod adoption completed: server actions, `searchParams` and environment configuration are all
  validated (`src/shared/env.ts`). Keep every _new_ external input Zod-validated.

## Notes

- Do **not** push to the remote unless the human explicitly asks.
- For current project status and pending work, see `README.md` and the files under `tasks/`.
- Secrets live in `.env` / environment variables only — never committed.
