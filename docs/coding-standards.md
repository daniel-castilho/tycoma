```markdown
# Coding Standards — TypeScript / Next.js / Prisma (Tycoma)

Practical reference for solo and AI-assisted development. Goal: **consistency over time**, not ceremony. Living document — edit as the project evolves.

**Relationship to other docs:**

| Doc               | Wins when                                            |
| ----------------- | ---------------------------------------------------- |
| `AGENTS.md`       | Project conventions, release flow, hard agent rules  |
| **This file**     | Day-to-day coding detail that does not fit in AGENTS |
| `docs/lessons.md` | Durable rules learned the hard way                   |

Where this file conflicts with `AGENTS.md`, **`AGENTS.md` wins**.

---

## 1. Naming

| Element                        | Convention                             | Example                                           |
| ------------------------------ | -------------------------------------- | ------------------------------------------------- |
| Packages / folders             | lowercase, kebab-case or feature-first | `src/modules/content`, `src/modules/auth`         |
| Files (components)             | PascalCase                             | `ContentEditor.tsx`, `AuthProvider.tsx`           |
| Files (utils, hooks, services) | camelCase or kebab-case                | `useSession.ts`, `content-repository.ts`          |
| Classes / types / interfaces   | PascalCase                             | `ContentApplicationService`, `PasswordHasherPort` |
| Functions / variables / hooks  | camelCase                              | `calculateSlug()`, `unitPrice`, `useAuth()`       |
| Constants                      | UPPER_SNAKE_CASE                       | `MAX_RETRY_COUNT`, `DEFAULT_PAGE_SIZE`            |
| Environment variables          | UPPER_SNAKE_CASE                       | `DATABASE_URL`, `REDIS_URL`                       |
| Prisma models / fields         | PascalCase models, camelCase fields    | `model User { createdAt DateTime }`               |
| Tests                          | `*.test.ts`                            | `content.service.test.ts`                         |
| Routes (App Router)            | kebab-case folders                     | `app/(dashboard)/content/[id]/page.tsx`           |

Name for **what it is or does**, not the implementation: `ContentRepositoryPort`, not `PrismaContentDaoV2`.

---

## 2. Package / folder structure (feature first, hexagonal)
```

src/
├── modules/
│ └── <feature>/ # e.g. content, auth, media
│ ├── domain/
│ │ ├── model/ # entities + value objects — zero framework imports
│ │ ├── port/
│ │ │ ├── in/ # use-case interfaces (commands/queries)
│ │ │ └── out/ # repository, hasher, cache, mail…
│ │ └── exception/
│ ├── application/
│ │ ├── service/ # use-case implementations (depend on ports only)
│ │ └── dto/ # commands / results — never nested inside ports
│ ├── adapter/
│ │ ├── in/ # Next.js route handlers, Server Actions, API routes
│ │ └── out/ # Prisma, Redis, bcrypt, jose, external APIs + mappers
│ └── index.ts # public barrel (ports + services only)
├── shared/ # cross-cutting pure utilities (no feature knowledge)
├── app/ # Next.js App Router (composition root only)
│ ├── (public)/
│ ├── (dashboard)/
│ ├── api/
│ └── layout.tsx / page.tsx
├── lib/ # framework glue (prisma client, redis client, auth helpers)
└── types/ # global ambient types only when unavoidable

```

**Framework boundary (enforce with eslint + architecture tests when possible):**

| Layer | Framework / external imports |
|-------|------------------------------|
| `domain/` | **None** — no `next/*`, `@prisma/client`, `ioredis`, `jose`, `bcryptjs`, React |
| `application/` | **Minimal** — pure TypeScript + ports; no React, no Prisma, no Next.js APIs |
| `adapter/` | Full stack allowed (Prisma, Redis, Next.js, jose, bcryptjs, zod schemas for input) |
| `app/` | Composition only — thin Server Components / Server Actions that call application services |

Cross-module access is **ports only**. Shared UI components live under `src/components` or feature `adapter/in/ui` and never contain business rules.

---

## 3. Next.js / React / TypeScript

- **App Router only.** No Pages Router. Prefer Server Components by default; mark `"use client"` only when interactivity or browser APIs are required.
- **Server Actions** for mutations; Route Handlers (`app/api/.../route.ts`) for external webhooks or pure HTTP APIs.
- **Thin UI / actions.** Bind input → validate with Zod → call application service → return result or redirect. No business rules in components, Server Actions or `.tsx` files.
- Prefer dependency injection via constructor or factory functions over direct imports of concrete adapters inside application services.
- **Zod** for all external input (forms, query params, API bodies, env). Infer types with `z.infer`. Keep schemas next to the adapter that receives the data.
- TypeScript strict mode (`"strict": true`). No `any` unless justified and documented. Prefer `unknown` + narrowing.
- React 19: use modern patterns (`use`, `useActionState`, `useOptimistic` where they reduce complexity). Avoid unnecessary client state.
- Never import server-only code (`@prisma/client`, secrets, Node APIs) into Client Components.
- Environment variables: only `NEXT_PUBLIC_*` on the client; everything else server-only.

---

## 4. Formatting & tooling

- 2 spaces, no tabs (Prettier default for the stack)
- Soft line length ~100–120
- Semicolons optional but consistent (project Prettier config wins)
- One primary export per file when practical
- Imports: Node built-ins → external packages → internal (`@/` alias) → relative; **no wildcards** (`import * as`)
- Run `npm run lint` + `npm run typecheck` before commit
- Format on save / pre-commit (Prettier + ESLint)

---

## 5. Errors & logging

- Never empty `catch`. Log with context (ids, operation, userId when safe), not only `"error occurred"`.
- Prefer domain / application exceptions (extend `Error` or use Result types). Map to HTTP status or user-facing messages only in adapters.
- Domain exceptions live under `domain/exception`.
- Logging: structured `console` (or pino if later introduced). Levels:
  - `error` — needs attention
  - `warn` — handled anomaly
  - `info` — significant lifecycle
  - `debug` — diagnostic detail
- Never log passwords, tokens, full session payloads or PII beyond what is required for debugging.

---

## 6. Persistence (Prisma) & cache (Redis)

- Single Prisma client instance (singleton in `lib/prisma.ts`). Do not create new clients per request.
- Prisma models are persistence records — business invariants stay in the domain model. Map with explicit mappers in `adapter/out`.
- Prefer explicit `select` / `include`. Avoid over-fetching. Watch for N+1 (use `include` or raw queries judiciously).
- Transactions: `prisma.$transaction` on multi-step writes inside application services (or the adapter that implements the port).
- Soft deletes or audit fields: decide once and apply consistently (document in `docs/lessons.md`).
- Schema changes: Prisma Migrate (`prisma migrate dev` / `deploy`). Never edit the production database by hand. Keep migrations reversible when non-trivial.
- Redis (`ioredis`): use for cache, sessions or rate-limiting only. Key naming convention: `tycoma:<module>:<id>:<purpose>`. Always set TTL. Never store secrets or large blobs.
- Connection management: reuse clients; close only on process shutdown.

---

## 7. Testing

| Kind | Tooling | Notes |
|------|---------|--------|
| Domain | Node test runner (`node --test`) | Pure invariants, no mocks |
| Application | Node test runner + mocked ports | Assert on use-case results |
| Adapters | `*.test.ts` + Testcontainers (Postgres, Redis) when needed | Real Prisma / ioredis against containers |
| Architecture | Optional ArchUnit-style or eslint rules | Ports are interfaces; DTOs not nested in ports |

- Method / test names: `method_condition_expectedResult` or descriptive `it("should …")`
- Fast loop: `npm test` (skips containers by default)
- After significant changes: `npm run build` + smoke against `docker compose`

---

## 8. Documentation

- JSDoc / TSDoc where purpose is not obvious from the name; skip trivial getters.
- Comment **why**, not what.
- English only for code, comments, commits, and docs.
- Releases: `docs/releases/v0.X.0.md`. Durable rules: `docs/lessons.md`. Epic status: `tasks/*`.

---

## 9. Version control

- Imperative commit subject: `Fix null pointer in content slug generation`
- Small, focused commits
- Do **not** push unless the human asks
- Annotated tags only at milestones with DoD met (`v0.X.0` — see `AGENTS.md`)

---

## 10. Security

- Server-side validation always (Zod); never trust the client alone.
- Parameterized Prisma queries only — never concatenate user input into raw SQL.
- Passwords: **bcryptjs** (or Argon2 if upgraded) with appropriate cost factor. Never store plain text.
- Sessions / tokens: **jose** for JWT (prefer short-lived access + refresh or iron-session style). HttpOnly + Secure cookies.
- Secrets via environment variables / `.env` (never committed). Use `dotenv` or Next.js built-in loading.
- RBAC / auth: keep a single source of truth (e.g. middleware + session helper). Extend the existing model — do not invent a second one.
- HTML / Markdown in user content: sanitize with a maintained library (e.g. DOMPurify or isomorphic-dompurify) before rendering.
- Rate-limit sensitive endpoints (login, password reset) via Redis.
- CSRF: Next.js Server Actions are protected by default; for Route Handlers follow the project’s established pattern.

---

## Quick pre-commit checklist

- [ ] Formatted; no wildcard imports
- [ ] No `console.log` left in production paths; no empty catch
- [ ] Domain free of Next.js / Prisma / Redis / jose / bcrypt
- [ ] DTOs in `application/dto`; ports are interfaces
- [ ] New Prisma model reflected in migration
- [ ] Unit test for new domain/application behaviour
- [ ] No secrets in the diff
- [ ] `"use client"` only when strictly necessary
- [ ] Zod schema for every external input
- [ ] Commit message says what and why

---
```
