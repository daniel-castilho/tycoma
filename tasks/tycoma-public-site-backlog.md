### 1. `tasks/tycoma-public-site-backlog.md`

```markdown
# Public Site — Backlog Status

**Companion documents:**
`tycoma-public-site-module-spec.md` · `tycoma-public-site-implementation-sequence.md` · `tycoma-ai-software-engineer-prompt-public-site.md`

**Document status:** Living — mark stories as they land. **Read this in conjunction with `tycoma-public-site-implementation-sequence.md`.**

**Epic goal:** Give anonymous visitors a coherent **reading experience** for content already managed in the Admin Dashboard: home, posts, pages, taxonomy, navigation, settings/SEO metadata, media URLs, and friendly 404s — while keeping `src/app/(site)/**` a **composition layer only** (no business rules of its own).

**Prerequisite:** Admin Dashboard epic (`v0.1.0`) is shipped. Content, media, settings, menus, SEO defaults, and sitemap write paths already exist in `content` / `media`.

---

## Scope Summary (v1 — Public Site MVP)

| Lane                          | Priority   | Status | Notes                                                   |
| ----------------------------- | ---------- | ------ | ------------------------------------------------------- |
| Public layout shell           | Essential  | Done   | Settings + main menu + footer                           |
| Home                          | Essential  | Done   | Published posts list                                    |
| Posts (list + detail by slug) | Essential  | Done   | Published only; metadata; `/posts` index added as follow-up  |
| Pages (detail by slug)        | Essential  | Done   | Published only; metadata; top-level `/[slug]`           |
| Taxonomy (category / tag)     | Essential  | Done   | Listings + detail of published posts                    |
| Media on public pages         | Essential  | Done   | S3/LocalStack URLs via `media.getMedia`                 |
| SEO metadata                  | Essential  | Done   | `generateMetadata` + settings defaults                  |
| Not-found / unpublished       | Essential  | Done   | `notFound()`; drafts never leak                         |
| Sitemap alignment             | Soon-after | Done   | Confirmed — publishes posts/pages                       |
| RSS / feed                    | Deferred   | Out     | Not in this epic                                        |
| Comments / search UI          | Deferred   | Out     | Not in this epic                                        |

"Essential" = required for a usable single-tenant public CMS front.
"Soon-after" = still this epic if time allows after the reading paths work.
"Deferred" = explicit non-goals for this epic.

---

## Planned Stories

### Foundation — public shell

- [x] **P1** — Public layout under `src/app/(site)/layout.tsx`: site title/branding from site settings; primary navigation from the active/published menu (nested items); minimal footer (site name / optional settings fields already available). No new design system or UI library.
- [x] **P2** — Home page at `src/app/(site)/page.tsx`: list **published** posts (newest first) with title, optional excerpt/summary, date, link to detail. Empty state when no published posts exist.
- [x] **P3** — Shared presentational helpers colocated under `src/app/(site)/_components` (e.g. `PostCard`, `SiteHeader`, `SiteFooter`, `Prose`) — presentation only, no use-case logic inside components beyond props. (Shipped as `PublicNav` + `_lib/format`; cards/header/footer stay inline — noted as follow-up.)

### Content reading — posts

- [x] **P4** — Public post detail by slug (route: `/posts/[slug]`). Only **published** posts. Render title, body, dates, category/tag links, featured media if the model already supports it.
- [x] **P5** — `generateMetadata` for post detail from post fields + SEO defaults + site settings (title, description; canonical when base URL is available).
- [x] **P6** — Optional public posts index at `/posts` (paginated or simple full list of published posts). Deferred to follow-up. **(Shipped: `/posts` — full list of published posts, newest first, with metadata. Pagination deferred further — see notes.)**

### Content reading — pages

- [x] **P7** — Public page detail by slug. URL scheme: **top-level `/[slug]`** — chosen to stay compatible with the existing `/sitemap.xml` (pages already emitted at `/{slug}`) and with the menu resolver; documented in the module spec.
- [x] **P8** — `generateMetadata` for page detail (same rules as posts).
- [x] **P9** — Hierarchy hint optional: parent/child breadcrumb. Deferred to follow-up (model has `parentId`, but no public read path for it yet). **(Shipped: `content.getPageBreadcrumb` + breadcrumb nav on public page detail.)**

### Taxonomy

- [x] **P10** — Category detail: list published posts in that category (by slug or id per existing ports). Linkable from post detail and menus.
- [x] **P11** — Tag detail: list published posts with that tag.
- [x] **P12** — Index pages for categories/tags (`/categories`, `/tags`) with published counts.

### Media & assets

- [x] **P13** — Resolve media public URLs on the front (featured image). `next/image` used (S3 remote host already configured via `next.config.ts`).
- [x] **P14** — Logo/favicon from site settings render in the public layout when media ids are set. (Logo renders; favicon link tag not yet added — follow-up.)

### SEO, sitemap, errors

- [x] **P15** — Site-wide fallback metadata from SEO defaults + site settings on the public layout/home.
- [x] **P16** — Confirm `/sitemap.xml` lists published posts/pages; verified working, no gaps found (no second sitemap pipeline).
- [x] **P17** — Friendly `not-found` for missing or unpublished slugs; drafts never appear on public routes.

### Application / port gaps (owning module: `content` / `media`)

- [x] **P18** — Added missing **public-read use cases** in `content` (`use-cases/public.ts`): published post/page by slug, list published posts/pages, posts by category/tag, public nav resolver. Domain ports + application factories + infrastructure adapters; wired through `application/index.ts`.
- [x] **P19** — Unit tests for every new application behaviour (`public.test.ts`, Node test runner; application tests mock ports only).

---

## Explicitly Out of Scope for this epic

Do **not** build as part of Public Site MVP:

- Block-based or rich Markdown rendering library (unless human approves a dependency; body can render as structured HTML/plain/preformatted consistent with admin preview)
- Custom content types
- Public headless API / webhooks
- Comments, full-text search UI, RSS
- 301 redirects manager
- Revision history
- Multi-user / public accounts
- Design system overhaul, Tailwind introduction, or new CSS frameworks
- Admin feature work except the minimum required to support public reads
- Prisma 7 upgrade

---

## Definition of Done (epic)

- [x] Anonymous visitor can browse home, open published posts/pages by slug, and browse category/tag listings
- [x] Navigation menu and site settings drive the public shell
- [x] Drafts and missing slugs do not leak; 404 is friendly
- [x] Metadata is set per route; sitemap still works
- [x] Media URLs render on public pages
- [x] Hexagonal boundaries respected; new reads live in owning modules
- [x] `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` pass
- [x] Manual smoke against `docker:up` + `npm run dev` documented
- [x] Backlog statuses updated to match reality

---

_This backlog tracks the Public Site MVP. Update story checkboxes as work lands; keep deferred items deferred unless the human expands scope._
```
