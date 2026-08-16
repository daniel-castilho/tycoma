### 2. `tasks/tycoma-public-site-implementation-sequence.md`

```markdown
# Public Site — Implementation Sequence (Planned)

**Companion docs:** `tycoma-public-site-module-spec.md` · `tycoma-public-site-backlog.md` · `tycoma-ai-software-engineer-prompt-public-site.md`

**Document status:** Shipped (v0.2.0). All three phases completed. Deviations from the plan are noted inline below.

---

## Guiding principle

`src/app/(site)/**` is a **composition layer**:

- No domain entities or Prisma models of its own
- No direct database, Redis, or S3 access — always through a module’s `application` use case (via `src/app/_lib/modules.ts`)
- Depends on `content` and `media` public application surfaces (and settings/menus already owned by `content`)
- Thin Next.js Server Components + `generateMetadata` + presentation components
- **Published-only** reads for anonymous visitors

Deliver in **vertical slices** (route + use case if missing + minimal styling + test), not a big upfront redesign of the content module.

---

## Planned delivery sequence

### Phase 1 — Read ports & public shell

**Target milestone:** v0.2.0 (phase 1 of public site) — **Done**

1. Inventory existing `content` / `media` read use cases and ports (list posts, get by id, settings, menus, etc.).
2. Add any missing **public-read** use cases (P18): published post by slug, published page by slug, list published posts, posts by category/tag slug — domain → application → infrastructure → wire in `modules.ts`.
3. Public layout shell (P1, P14): settings + menu + footer.
4. Home page listing published posts (P2, P3).

**Outcome:** Visiting `/` shows real published content inside a settings/menu-driven shell without admin auth.

> Note: the public-read use cases live in `content/application/use-cases/public.ts` (not spread across existing files), and the framework `modules.ts` needed no change because the new exports are wired inside `content/application/index.ts`.

---

### Phase 2 — Post & page reading

**Target milestone:** v0.2.0 (phase 2) — **Done**

| Step | Stories | Deliverable                                            |
| ---- | ------- | ------------------------------------------------------ |
| 2.1  | P4–P5   | Post detail by slug + metadata                         |
| 2.2  | P7–P8   | Page detail by slug + metadata (URL scheme documented) |
| 2.3  | P6      | Optional `/posts` index — **deferred** (follow-up)     |
| 2.4  | P13     | Featured/body media URLs on detail pages               |
| 2.5  | P17     | `notFound()` for missing/unpublished                   |

**Outcome:** Menu links to posts/pages resolve; drafts stay private.

> URL scheme decision: pages are served at **top-level `/[slug]`** (not `/pages/[slug]`) to stay consistent with the existing `/sitemap.xml`, which already emits published pages at `/{slug}`, and with the public-nav resolver. Post routes stay at `/posts/[slug]`. Reserved top-level slugs (`posts`, `categories`, `tags`, `admin`) win over `[slug]`, so a page whose slug collides would be shadowed — documented as a follow-up.

---

### Phase 3 — Taxonomy & SEO polish

**Target milestone:** v0.2.0 (phase 3) — **Done**

1. Category detail listing (P10)
2. Tag detail listing (P11)
3. Optional taxonomy indexes (P12) — `/categories` + `/tags` shipped
4. Site-wide metadata fallbacks (P15)
5. Sitemap confirmation / minimal extension (P16) — confirmed working, no changes needed
6. Tests for new use cases (P19)

**Outcome:** Full MVP reading paths + basic SEO coherence.

> Deferred within this phase (kept as follow-ups): `/posts` index (P6), page-hierarchy breadcrumb (P9), favicon `<link>` from settings (part of P14), and splitting cards/header/footer into `_components` (part of P3).

---

## Recommended order for any _new_ public feature

1. Confirm `content` or `media` exposes (or can expose) the read use case — add it in the owning module first.
2. Wire through the module’s `application/index.ts` and `src/app/_lib/modules.ts` if new exports are needed.
3. Add the route under `src/app/(site)/**` as a Server Component.
4. Add `generateMetadata` where the route is user-facing content.
5. Zod-validate `params` / `searchParams`.
6. Unit-test new application/domain behaviour.
7. Smoke-test with published and draft fixtures.
8. Update the backlog and this sequence if order changed.

---

## Definition of Done (sequence)

- [x] Phase 1 — Read ports & public shell
- [x] Phase 2 — Post & page reading
- [x] Phase 3 — Taxonomy & SEO polish

---

## Suggested git / release hygiene

- Small, focused commits (English imperative subjects).
- Do **not** push unless the human asks.
- When the epic meets DoD, follow `AGENTS.md` Releases: `docs/releases/v0.2.0.md`, `CHANGELOG.md`, README “Current State”, tag only when human requests.

---

_This is the planned execution order, written before implementation starts. Once phases ship, keep this file updated (or note deviations) so backlog and sequence stay aligned._
```
