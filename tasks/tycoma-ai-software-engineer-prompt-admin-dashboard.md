# AI Software Engineer Prompt — Admin Dashboard

**Status:** The Admin Dashboard module has **not been built yet**. This prompt is for agents doing
the **green-field build**, following the planned sequence — not for extending existing code.

---

## Project context

- Single-tenant CMS, single administrator (no multi-user, no roles, in v1)
- **Runtime:** Node.js 24.x (LTS)
- **Framework:** Next.js 16.3 (App Router)
- **Language:** TypeScript, strict mode
- **ORM / DB:** Prisma 7.9.1 + MongoDB
- **Cache / sessions / rate limiting:** Redis (`ioredis`)
- **Architecture:** Modular monolith, Hexagonal (Ports & Adapters), organized as modules
  (`content`, `media`, `auth`) under `src/modules/`, prepared for future extraction into
  microservices with minimal impact — but **do not build microservices now**

**Sources of truth (read in this order):**

1. `tycoma-admin-dashboard-module-spec.md` — target module design
2. `tycoma-admin-dashboard-backlog.md` — planned stories and scope
3. `tycoma-admin-dashboard-implementation-sequence.md` — intended delivery order
4. Existing code under `src/modules/` and `src/app/admin/`
5. `README.md` and `.env.example` at the project root

---

## What this module is

`admin-dashboard` (the `src/app/admin/**` tree) is a **composition layer**:

- No domain entities or Prisma models of its own
- No direct Prisma or Redis calls — always go through a module's `application` use case
- Depends only on the `application` layer of `content`, `media`, and `auth` — never on their
  `infrastructure` (Prisma repositories, storage adapters, session adapters) directly
- Thin Server Components / Server Actions / Route Handlers + presentation DTOs

```
src/modules/<content|media|auth>/
├── domain/          → entities + repository interfaces (no Prisma, no Next.js types)
├── application/
│   └── use-cases/   → one file, one action (CreatePost, PublishPost, Login, ...)
└── infrastructure/  → Prisma repository implementations, adapters

src/app/admin/**      → composition only; imports from modules' application/use-cases
```

---

## Non-negotiable rules

1. **Hexagonal boundaries** — `admin-dashboard` code never imports a module's `infrastructure`
   layer or Prisma client directly; only `application` use cases.
2. **Zero framework leakage into `domain`** — no Prisma types, no Next.js `Request`/`Response`,
   no React, inside any module's `domain/` folder.
3. **Every `/admin` route is behind the session guard** — no page under `src/app/admin/**` should
   be reachable without a valid session, except the first-run `/setup` flow (only while no `User`
   exists) and `/login` / `/forgot-password` / `/reset-password`.
4. **No new npm dependency without explicit human approval.**
5. **TypeScript strict mode** — no `any` used to bypass a modeling problem; fix the model instead.
6. **UI consistency** — Tailwind utility classes only, reuse shared components (forms, tables,
   modals, status badges) instead of duplicating markup per screen.
7. **Passwords and reset tokens are always hashed at rest** — bcrypt for passwords, a hash (not the
   raw token) for password-reset tokens.

---

## Nothing has shipped yet — build in this order

Follow `tycoma-admin-dashboard-implementation-sequence.md`:

1. Phase 1 — Foundation & access control (setup, login, password recovery, session guard, rate
   limiting)
2. Phase 2 — Core content management (dashboard KPIs, posts, pages, categories/tags)
3. Phase 3 — Media
4. Phase 4 — Site structure & SEO (settings, menus, SEO panel)
5. Phase 5 — Monitoring (audit log)

Do not start Phase 2 work before Phase 1's session guard exists — every subsequent screen depends
on it.

---

## How to add a new admin feature

1. Confirm the **owning module** (`content`, `media`, or `auth`) already exposes — or can be
   extended to expose — the use case you need. If it doesn't exist, add it there first.
2. Add the composition logic (Server Action or Route Handler) under `src/app/admin/<area>/`.
3. Add the page/route, using shared UI components where they exist.
4. Confirm the route sits under the session-guarded path (by directory convention it should — verify
   the middleware matcher covers it).
5. Unit-test the composition logic if it does more than pass data through; make sure the owning
   module's use case has its own tests.
6. Run `npm run dev` and smoke-test the flow manually.
7. Update `tycoma-admin-dashboard-backlog.md` status for the story you completed.

**Do not:**

- Put business rules, validation logic, or persistence calls inside `src/app/admin/**`
- Import a module's Prisma repository or Redis client directly from the admin app tree
- Add a new npm dependency without explicit human approval
- Hardcode colors/spacing instead of using the shared Tailwind config
- Build any of the features listed as deferred in `tycoma-admin-dashboard-module-spec.md` §4
  unless the human explicitly asks for it

---

## Useful commands

```bash
npm run dev              # local dev server
npm run typecheck        # tsc --noEmit
npm run lint              # eslint
npm run prisma:generate   # regenerate Prisma client after a schema change
npm run prisma:push       # sync schema.prisma to MongoDB (no traditional migrations)
npm run prisma:studio     # inspect data visually
```

After changing a module's `domain`/`application` layer, re-run `npm run typecheck` before touching
`admin-dashboard` code that depends on it.

---

## Design decisions already made — do not relitigate these

- Node 24 LTS, Next.js 16.3, Prisma 7.9.1, MongoDB, Redis — versions are fixed for this project.
- MongoDB via Prisma: IDs are `String @id @default(auto()) @map("_id") @db.ObjectId`; there is no
  traditional migration history, only `prisma db push`; multi-document transactions require an
  Atlas replica set and should not be assumed available by default.
- Single admin account for v1 — no roles/permissions system, but the `User` model and session guard
  should not hardcode "there is exactly one user" in a way that blocks adding more later.
- `admin-dashboard` is composition-only — this was a deliberate choice, not a default; do not add
  business logic to it "just this once."

---

## When stuck

Stop and ask the human if:

- A new third-party dependency seems required
- A change would put business rules inside `admin-dashboard` instead of the owning module
- A feature needs domain modeling that hasn't been decided yet (e.g., which module owns `Settings`
  or `Menu` — see the Open Questions section of `tycoma-admin-dashboard-module-spec.md`)
- You're about to build something listed as deferred in the module spec

Do **not** push to a remote repository unless the human explicitly asks.

---

_This is the green-field build prompt. Once the epic ships, consider rewriting it as a
maintenance/extension prompt, the way the reference template for a previous project does — keeping
this original version visible in git history._
