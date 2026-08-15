# Admin Dashboard — Backlog Status

**Companion documents:**
`tycoma-admin-dashboard-module-spec.md` · `tycoma-admin-dashboard-implementation-sequence.md` · `tycoma-ai-software-engineer-prompt-admin-dashboard.md`

**Document status:** Living — being updated as the build progresses. The first three tasks below
(rewriting the status, re-marking shipped Phase 1 work, and adjusting the scope summary) were done
during a code audit before any new feature was implemented; subsequent edits mark stories as they
land. **Read this in conjunction with `tycoma-admin-dashboard-implementation-sequence.md`.**

**Epic goal:** Provide the single administrator with a functional back-office to manage content
(posts, pages, categories, tags), media, site structure (navigation menus, settings, SEO) and their
own account, while respecting hexagonal boundaries — `admin-dashboard` is a **composition layer
only**, with no business rules of its own.

---

## Scope Summary (v1)

| Lane                                | Priority   | Status         | Notes                                                        |
| ------------------------------------ | ---------- | -------------- | ------------------------------------------------------------- |
| Foundation & Access Control          | Essential  | Mostly shipped | Domain/use cases/infrastructure + setup page shipped; UI for /login, /forgot-password, /reset-password still pending (S3 form, S4 pages) |
| Dashboard Home                       | Essential  | Mostly shipped | KPIs page wired to `getDashboardKpis`; "recently updated" list + empty state done. Media-storage KPI still pending (depends on `media` use cases in Phase 3) |
| Content Management — Posts           | Essential  | Mostly shipped | List, create/edit, preview, bulk all wired. Form fields for categories/tags/featured image/OG image still pending. |
| Content Management — Pages           | Essential  | Shipped        | List, create/edit, parent/child hierarchy                      |
| Taxonomy — Categories & Tags         | Essential  | Not started    | CRUD, category hierarchy, usage counts                         |
| Media Library                        | Essential  | Not started    | Upload, grid, metadata, usage guard on delete                  |
| Site Settings                        | Essential  | Not started    | Title, description, logo, favicon, timezone, base URL          |
| Account / Profile                    | Essential  | Not started    | Edit profile, change password (use cases exist, UI pending)    |
| Navigation Menus                     | Soon-after | Not started    | Menu CRUD, drag-and-drop items, submenu support                |
| SEO Panel                            | Soon-after | Not started    | Default meta fallback, Google preview, sitemap status          |
| Audit Log                            | Soon-after | Not started    | Actor/event/entity trail, filters                               |

"Essential" = must exist for the admin to be usable day-to-day.
"Soon-after" = still v1, but can land once the essential lane is stable.

### Phase 1 inventory (already shipped at the code level — verified during audit)

| Story | Status | Where to look |
| --- | --- | --- |
| S1 — `User` + `PasswordResetToken` Prisma models | Done | `prisma/schema.prisma:10-27` |
| S2 — `/setup` page + lockout | Done | `src/app/admin/(auth)/setup/page.tsx`, server action in `_actions/auth.ts` |
| S3 — Login (backend) | Mostly done | `src/modules/auth/application/use-cases/login.ts`, `src/modules/auth/infrastructure/jwt-session-issuer.ts`, server action `_actions/auth.ts:54-72`. **Missing:** actual `<form>` on `/admin/login/page.tsx` (page currently shows a placeholder) |
| S4 — Password recovery (backend) | Mostly done | `src/modules/auth/application/use-cases/{request-password-reset,reset-password}.ts`, `infrastructure/console-mailer.ts`, server actions `forgotPasswordAction`/`resetPasswordAction`. **Missing:** `/admin/forgot-password/page.tsx` and `/admin/reset-password/page.tsx` |
| S5 — Session guard/middleware | Done | `src/proxy.ts`, matcher `["/admin", "/admin/:path*"]`, helpers in `src/app/admin/_lib/auth-routes.ts` |
| S6 — Rate limiting (Redis) on auth endpoints | Done | `src/modules/auth/infrastructure/redis-rate-limiter.ts`; called from `login.ts` (8 / 15 min) and `request-password-reset.ts` (5 / 15 min) |

**Boundary cleanup performed during this audit:** the middleware previously imported
`@/modules/auth/infrastructure/jwt-session-issuer` directly, violating the §1 hard rule of
`tycoma-admin-dashboard-module-spec.md`. That import now goes through `verifySession` (or, for the
Edge runtime, a dedicated `verifySessionToken` exposed by `auth/application`) — the
`infrastructure/` path is no longer reachable from the app tree.

---

## Planned Stories

### Foundation & Access Control

- [x] **S1** — `User` and `PasswordResetToken` domain models in the `auth` module (Prisma schema, `@db.ObjectId`)
- [x] **S2** — First-run `/setup` flow: if no admin exists, redirect here to create the single account; route locks permanently once a `User` exists
- [x] **S3** — Login use case, JWT session issuance, httpOnly/secure/sameSite cookie; server action wired up; UI form on `/admin/login/page.tsx` consuming `loginAction`, plus a "Forgot your password?" link to `/admin/forgot-password` and the matching `.auth-foot` style in `globals.css`
- [x] **S4** — Password recovery use cases (request + reset), hashed short-lived tokens, console mailer; server actions wired up; UI pages `/admin/forgot-password/page.tsx` and `/admin/reset-password/page.tsx` consuming `forgotPasswordAction` and `resetPasswordAction` (reset page accepts the raw token via `?token=` and forwards it as a hidden field)
- [x] **S5** — Session guard/middleware protecting every route under `/admin` (refactored to import `verifySessionToken` from `auth/application`, not from `infrastructure`)
- [x] **S6** — Rate limiting on login and password-recovery endpoints (Redis-backed, per IP/e-mail)

### Dashboard Home

- [x] **S7 (content KPIs)** — Dashboard home wired to `getDashboardKpis` (`/admin/(authed)/dashboard/page.tsx`): post/page counts by status, "recently updated posts" table, empty state with CTA to create the first post. **Media-storage KPI deferred to Phase 3** (the `media` module has no use cases yet).
- **S7 (media KPI)** — Will land with Phase 3 once the `media` module exposes a storage-stats use case.

### Admin shell (cross-cutting, introduced alongside S7)

- [x] Sidebar layout (`src/app/admin/(authed)/layout.tsx`) with nav for Dashboard, Posts, Pages, Taxonomy, Media, Menus, Settings, SEO, Account, Audit log — visible items may 404 until their respective stories land, that's expected.
- [x] Top bar with "Signed in as {name}" (resolved via `verifySessionToken` from `auth/application/edge`) and a sign-out form wired to `logoutAction`.
- [x] `src/app/admin/page.tsx` redirects to `/admin/dashboard`.
- [x] Shared components under `src/app/admin/(authed)/_components`: `StatusBadge`, `EmptyState`, `DataTable`, `TextField`/`TextArea`/`SelectField`, `SubmitButton`. Local styles in `admin-shell.css`; no global pollution, no new dependencies.
- [x] Public auth flows (`/admin/setup`, `/admin/login`, `/admin/forgot-password`, `/admin/reset-password`) keep their original `(auth)/layout.tsx` (card-only) — they no longer sit inside the sidebar shell, achieved by moving the authed UI into a sibling route group `(authed)` without a parent `admin/layout.tsx`.

### Content Management — Posts

- [x] **S8** — Post list with status filter, category filter, search (title), sort (updatedAt/publishedAt/title, asc/desc). Server Component at `/admin/posts`, queries through `listPosts` use case.
- [x] **S9** — Post create/edit form (`/admin/posts/new`, `/admin/posts/[id]`) using a shared `PostForm` client component (TextField/TextArea/SelectField/SubmitButton). Handles status, scheduledAt, publishedAt, slug auto-generation. Categories/tags/featured image/OG image fields deferred — `PostWrite` and Prisma schema already support them, but the form controls aren't wired up yet. See follow-up below.
- [x] **S10** — Post preview at `/admin/posts/[id]/preview` renders the post inside an article shell, without changing its status. Body is shown as preformatted text (no markdown rendering — that requires a new dependency, deferred).
- [x] **S11** — Bulk actions on the list page: select rows + "Delete selected" / "Publish selected" buttons. Wired to `bulkPosts` use case via `bulkPostsAction` Server Action.

**Posts follow-ups (deferred to next iteration):**
- Categories/tags multi-select and featured-image/OG-image pickers in the post form — schema and use cases support them, the UI controls aren't built yet.
- Markdown rendering for body in preview and on the public site (requires a parsing lib, new dependency, needs explicit approval).
- Date-range filter on the list (repo already supports `from`/`to`, UI doesn't yet).
- Row-level "Delete" button (current UX relies on checkbox + bulk action).

### Content Management — Pages

- [x] **S12** — Page list at `/admin/pages`: flat list, status badge, "under {parent path}" hint for child pages, empty state, link to create.
- [x] **S13** — Page create/edit at `/admin/pages/new` and `/admin/pages/[id]`, with parent selector (excluding self), status/scheduling, meta fields, preview link, delete button. New `deletePage` use case added (refuses to delete pages that still have children).

### Taxonomy — Categories & Tags

- **S14** — Category CRUD (name, slug, description, optional parent) + posts-per-category count
- **S15** — Tag CRUD (name, slug, description) + posts-per-tag count

### Media Library

- **S16** — Media upload (drag-and-drop, multi-file)
- **S17** — Media grid with search/filter by type
- **S18** — Media detail panel (alt text, caption, usage references across posts/pages, delete guard when in use)

### Site Settings

- **S19** — General settings: site title, description, logo, favicon, timezone, base URL (feeds SEO defaults and sitemap generation)

### Account / Profile

- [x] **S20 (backend)** — Use cases `getProfile` / `updateProfile` exist in `auth/application`; UI pending
- [x] **S21 (backend)** — Use case `changePassword` exists in `auth/application`; UI pending

### Navigation Menus

- **S22** — Menu CRUD (e.g. "Main menu", "Footer")
- **S23** — Menu items (link to post, page, category, or custom URL), drag-and-drop ordering, submenu support

### SEO Panel

- **S24** — Default SEO settings (fallback meta title/description used when content doesn't define its own)
- **S25** — Google result preview simulator
- **S26** — Sitemap status panel (link to `sitemap.xml`, last generation timestamp)

### Audit Log

- **S27** — Audit log data model + write path (actor, event type, entity type/id, timestamp, details) triggered from the owning modules' use cases
- **S28** — Audit log viewer (filters: event type, entity, date range, keyword search)

---

## Explicitly Out of Scope for v1

These were discussed and deliberately deferred — do not build them as part of this epic:

- Custom content types (beyond Post/Page)
- Block-based editor (starting with Markdown/rich text instead)
- Public headless content API
- Webhooks on publish/update
- Native comments
- 301 redirects manager
- Content revision history
- Automated backup/export scheduling (manual export can be a script, not a UI feature, for now)
- Multi-user management / roles beyond the single admin (the `User` model should not *block* this later, but no UI for it ships in v1)

---

## How the Module Should Be Structured

- `admin-dashboard` (realized as `src/app/admin/**` plus a thin composition layer) contains **only**
  composition logic and presentation DTOs — no domain entities, no direct Prisma access.
- All business rules and persistence live in the owning modules (`content`, `media`, `auth`) and are
  exposed via their `application` use cases, following the hexagonal structure already scaffolded by
  `setup-tycoma.sh`.
- Every `/admin` route is protected by the session guard (S5); there are no per-role permissions yet
  since there is a single admin, but the guard should not hardcode "there is exactly one user."
- UI follows a single shared design language (Tailwind + shared components) — no ad-hoc styling per page.

---

## Definition of Done (Epic)

- [x] First-run setup, login, password recovery (full), session guard
- [x] Dashboard with content KPIs (media-storage KPI deferred to Phase 3)
- [x] Post management (list, create/edit, preview, bulk — categories/tags/images picker fields deferred)
- [ ] Category / Tag management
- [ ] Media library with usage guard
- [ ] Site settings
- [ ] Account/profile management (use cases done, UI pending)
- [ ] Navigation menus
- [ ] SEO panel
- [ ] Audit log (write path + viewer)

---

_This backlog is a living planning document. Update statuses as stories are delivered; once the epic
ships, consider splitting it the way the reference template does (backlog vs. as-built sequence)._
