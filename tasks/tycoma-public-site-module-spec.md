### 3. `tasks/tycoma-public-site-module-spec.md`

```markdown
# Public Site — Technical Specification (Target Design)

**Status:** Shipped (v0.2.0) — target design validated as routes shipped. Open questions resolved below.
**Companion docs:** `tycoma-public-site-backlog.md` · `tycoma-public-site-implementation-sequence.md` · `tycoma-ai-software-engineer-prompt-public-site.md`

---

## 1. Purpose & Architectural Role

The public site (`src/app/(site)/**`) is a **composition layer**. It does **not** own business rules, domain entities, or Prisma models for posts, pages, taxonomy, media, settings, or menus.

It:

- Composes **read-oriented** use cases from `content` and `media` (via `src/app/_lib/modules.ts`)
- Renders anonymous, cache-friendly Server Components for the visitor-facing CMS
- Owns only presentation components and route-level metadata wiring

**Hard rules:**

- Zero business rules inside `src/app/(site)/**`
- Import only the wired application surface from `src/app/_lib/modules.ts` (or a module’s application exports meant for composition) — **never** `infrastructure/`
- Public routes must not call auth session APIs except where explicitly required later (not in MVP)
- **Published-only** visibility for posts/pages on public routes
- Zod for every dynamic `params` / `searchParams` input
- No new npm dependency without explicit human approval
- Prisma remains on **6.x** (MongoDB)

---

## 2. Package Layout (target)
```

src/
├── modules/
│ ├── content/
│ │ ├── domain/ → entities + \*Reader ports (published queries as needed)
│ │ ├── application/
│ │ │ ├── use-cases/ → public reads: getPublishedPostBySlug, listPublishedPosts, ...
│ │ │ └── index.ts → wiring factory
│ │ └── infrastructure/ → Prisma adapters
│ ├── media/
│ │ └── ... → URL resolution / get media by id if required for public render
│ └── ...
├── app/
│ ├── \_lib/
│ │ └── modules.ts → framework composition root (existing)
│ ├── (site)/ → public composition only
│ │ ├── layout.tsx
│ │ ├── page.tsx → home
│ │ ├── [slug]/page.tsx → page detail (top-level, matches sitemap)
│ │ ├── posts/
│ │ │ └── [slug]/page.tsx
│ │ ├── categories/
│ │ │ ├── page.tsx → index
│ │ │ └── [slug]/page.tsx
│ │ ├── tags/
│ │ │ ├── page.tsx → index
│ │ │ └── [slug]/page.tsx
│ │ ├── _components/ → PublicNav (+ format helpers in _lib)
│ │ └── not-found.tsx → segment not-found
│ ├── admin/ → unchanged composition for back-office
│ └── sitemap.xml/ → existing; aligned with published content
└── proxy.ts → admin guard only; public routes stay public

```

Exact folder names for pages vs top-level slugs may be adjusted at implementation time **if and only if** required for compatibility with stored menu URLs — document the final convention in this file when chosen.

---

## 3. What Should Be Implemented (by area)

### Public layout

- Load site settings and the navigation menu through content application use cases
- Render nested menu items (labels + hrefs derived from item type: post/page/category/custom)
- Logo/favicon when settings point at media ids

### Home

- List published posts ordered by published/updated date
- Empty state when none exist

### Posts / pages

- Detail by slug; 404 if missing or not published
- Body rendering: match whatever the admin already stores (plain/HTML/markdown-as-text). **Do not** add a markdown dependency without human approval
- Metadata via `generateMetadata`

### Taxonomy

- Category/tag pages list published posts only
- Link from post detail chips and from menu items of type category

### Media

- Resolve stored media to public URLs using existing media module patterns
- Respect existing `next/image` remotePatterns if present

### Sitemap & SEO

- Prefer extending the existing `/sitemap.xml` route using content reads
- Fallback title/description from SEO defaults + site settings

---

## 4. Deliberately Deferred

| Feature | Why deferred |
| -------------------------------- | -------------------------------- |
| Markdown/MDX pipeline | New dependency + sanitization policy |
| Block editor front-end | Admin does not ship blocks yet |
| Headless public API | Separate epic |
| Comments / search / RSS | Not required for MVP reading |
| 301 redirects | Separate epic when URLs change in production |
| Draft preview tokens | Nice-to-have; admin already has preview |
| i18n | Single-tenant, single locale for now |

---

## 5. UI Conventions

- Server Components by default
- Semantic HTML; minimal CSS consistent with existing project styles (`globals.css` / simple layout CSS)
- **No** new UI framework or Tailwind introduction in this epic unless already present and used
- Loading/empty states for lists are part of DoD
- Accessibility basics: landmark headers/nav, alt text from media metadata when available

---

## 6. Security & privacy

1. Never expose draft, scheduled-unpublished, or internal admin fields on public routes
2. Do not disable admin session guard or widen `/admin` matchers
3. Sanitize/assume stored HTML is trusted admin content for MVP; if HTML is rendered, do not introduce unsafe `eval`; follow any existing sanitization helper if present
4. No secrets in client bundles; public pages only receive DTO fields needed for display

---

## 7. Testing Expectations

- New use cases: unit tests in the owning module
- Domain tests: pure, no mocks
- Application tests: mock ports only
- Public routes: prefer not to over-test React trees; rely on use-case tests + manual smoke
- CI gates: `lint`, `typecheck`, `test`, `build` must stay green

---

## 8. Open Questions (resolved during Phase 1)

1. **Page URL scheme:** **top-level `/[slug]`**. Chosen to match the existing `/sitemap.xml` (pages are already emitted at `/{slug}`) and the public-nav resolver (`page` menu items → `/{slug}`). Posts stay at `/posts/[slug]`, categories at `/categories/[slug]`, tags at `/tags/[slug]`. Reserved static segments (`posts`, `categories`, `tags`, `admin`) take precedence over `[slug]`; a page whose slug collides with one of those would be shadowed (documented follow-up — admin should avoid such slugs).
2. **Body format:** stored as plain text/markdown-as-text (admin edits via a `TextArea`; admin preview renders in a `<pre>`). Public pages render it in `<pre class="site-article-body">` — **no** markdown dependency added (matches the "do not add markdown libs without approval" rule). Rich rendering is a follow-up.
3. **Which menu is “primary”:** resolved in `createGetPublicNav` in `content/application/use-cases/public.ts` — menu with slug `main` if present, else the first listed menu; an explicitly-requested slug that does not exist returns `[]` (no fallback). Menu items of type `post`/`page`/`category` resolve `refId` → public href only when the target is published; `custom` items use their stored `url`; unresolvable items are skipped.
4. **Pagination:** skipped for MVP (list use cases return full published sets); not required at expected post volumes.

---

## 9. Definition of Done (module / epic)

- [x] Public layout driven by settings + menu
- [x] Home lists published posts
- [x] Post and page detail by slug with metadata
- [x] Category and tag listings
- [x] Media URLs work on public pages
- [x] Drafts hidden; 404 for unknown slugs
- [x] Sitemap still valid
- [x] Boundaries respected; tests + quality gates green

---

_This document describes the target design. Update it when URL conventions or use-case names become concrete during implementation._
```
