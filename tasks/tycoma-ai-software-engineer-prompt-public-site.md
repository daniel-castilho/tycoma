### 4. `tasks/tycoma-ai-software-engineer-prompt-public-site.md`

````markdown
# AI Software Engineer Prompt — Public Site MVP

**Status:** Ready for agents implementing the **Public Site** epic after Admin Dashboard `v0.1.0`.

---

## Project context

- Single-tenant CMS, single administrator
- **Runtime:** Node.js 24.x
- **Framework:** Next.js 16 (App Router) + React 19
- **Language:** TypeScript strict
- **ORM / DB:** Prisma **6.x** + MongoDB replica set (do **not** upgrade to Prisma 7)
- **Cache:** Redis (`ioredis`)
- **Auth:** jose JWT httpOnly cookie; passwords Argon2id via `PasswordHasher` port
- **Validation:** Zod on all external inputs
- **Architecture:** Modular monolith, hexagonal modules under `src/modules/` (`auth`, `content`, `media`, `audit`)
- **Composition root:** `src/app/_lib/modules.ts`

**Sources of truth (read in this order):**

1. `AGENTS.md`
2. `tasks/tycoma-public-site-module-spec.md`
3. `tasks/tycoma-public-site-backlog.md`
4. `tasks/tycoma-public-site-implementation-sequence.md`
5. `docs/coding-standards.md`, `docs/lessons.md`
6. Existing code under `src/modules/content`, `src/modules/media`, `src/app/(site)`, `src/app/_lib/modules.ts`
7. `README.md`, `.env.example`

---

## What this epic is

Build the **anonymous public reading experience** in `src/app/(site)/**`:

- Composition only — no domain/Prisma in the app tree
- Reuse and extend **content** (and if needed **media**) read use cases
- Published-only content on public routes
- Settings + navigation menu drive the shell
- Metadata, 404s, media URLs, sitemap alignment

Admin Dashboard remains the write side; do not re-implement admin screens.

---

## Non-negotiable rules

1. Hexagonal boundaries — never import `infrastructure/` from `src/app/**`; use `src/app/_lib/modules.ts`.
2. Zero framework leakage into `domain/` — no Next.js, Prisma, React, jose, ioredis.
3. Cross-module ports only through domain interfaces; wire in `modules.ts`.
4. No new npm dependency without explicit human approval.
5. English only for code, comments, commits, docs, logs.
6. Server Components by default; `"use client"` only when strictly required.
7. Zod-validate `params` and `searchParams`.
8. Do not push to remote unless the human explicitly asks.
9. Do not build deferred features (API headless, comments, redirects manager, revisions, multi-user, block editor, Prisma 7).

---

## Build in this order

Follow `tycoma-public-site-implementation-sequence.md`:

1. **Phase 1** — Inventory reads; add missing published-by-slug / list use cases; public layout; home
2. **Phase 2** — Post detail, page detail, media URLs, not-found
3. **Phase 3** — Category/tag listings, metadata polish, sitemap check, tests

Do not start Phase 2 UI before the required read use cases exist and are wired.

---

## How to add a public read path

1. Check whether `content` (or `media`) already exposes the use case.
2. If missing, add port + use-case factory + adapter method + tests in the owning module.
3. Export via the module wiring factory; wire in `src/app/_lib/modules.ts` if needed.
4. Add the Server Component route under `src/app/(site)/**`.
5. Add `generateMetadata` for content pages.
6. Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.
7. Smoke-test published vs draft vs unknown slug.
8. Update `tycoma-public-site-backlog.md` checkboxes.

**Do not:**

- Put business rules or Prisma calls in `src/app/(site)/**`
- Show draft/scheduled-unpublished content publicly
- Break `/admin/**` session guard (`src/proxy.ts`)
- Add markdown/UI libraries without human approval
- Relitigate stack pins (Node 24, Next 16, Prisma 6, Argon2id, Zod)

---

## Useful commands

```bash
npm run docker:up
npm run prisma:generate
npm run prisma:push
npm run dev
npm test
npm run lint
npm run typecheck
npm run build
```
````

---

## Design decisions already made — do not relitigate

- Public site is composition-only under `(site)`
- Content ownership stays in `content`; media ownership in `media`
- Single primary public nav from existing menu model (resolve “which menu” explicitly if multiple exist)
- MVP body rendering uses stored format without new dependencies
- Quality gates must pass before considering the epic done

---

## When stuck

Stop and ask the human if:

- A new third-party dependency seems required (e.g. markdown, sanitizer, UI kit)
- Page URL scheme collides with menus or posts and needs a product decision
- A change would put business rules in `(site)` instead of the owning module
- Scope creeps into deferred roadmap items

Do **not** push unless the human explicitly asks.

---

## Done report (mandatory)

When finished, return:

```markdown
# Public Site MVP report

## Phases completed

## Routes added

## Use cases added/changed

## Open questions resolved (URL scheme, primary menu, body format)

## Quality gates

## Manual smoke

## Follow-ups
```

---

_This is the build prompt for the Public Site MVP epic. After the epic ships, keep it as historical context; use AGENTS.md + updated backlog for maintenance work._

```

```
