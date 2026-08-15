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
| Foundation & Access Control          | Essential  | Shipped        | Setup, login, recovery, session guard, rate limiting all wired end-to-end |
| Dashboard Home                       | Essential  | Shipped        | Content KPIs + media-storage KPI, "recently updated" list + empty state |
| Content Management — Posts           | Essential  | Mostly shipped | List, create/edit, preview, bulk all wired. Form fields for categories/tags/featured image/OG image still pending. |
| Content Management — Pages           | Essential  | Shipped        | List, create/edit, parent/child hierarchy                      |
| Taxonomy — Categories & Tags         | Essential  | Shipped        | CRUD, category hierarchy (cycle-guarded), usage counts, description field |
| Media Library                        | Essential  | Shipped        | Upload (multi-file via `/api/media`), grid + search/filter, metadata, usage guard on delete |
| Site Settings                        | Essential  | Shipped        | Title, description, logo, favicon, timezone, base URL          |
| Account / Profile                    | Essential  | Shipped        | Edit profile, change password                                  |
| Navigation Menus                     | Soon-after | Shipped        | Menu CRUD, items (post/page/category/custom URL), submenus — ordering via up/down buttons, drag-and-drop deferred (see S23) |
| SEO Panel                            | Soon-after | Shipped        | Default meta fallback, Google preview, sitemap status + `/sitemap.xml` |
| Audit Log                            | Soon-after | Shipped        | Actor/event/entity trail, filters — write path threaded into content/auth/media use cases |

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
`tycoma-admin-dashboard-module-spec.md`. That import now goes through the edge-safe
`verifySessionToken` exported by `auth/application/edge` — the `infrastructure/` path is no longer
reachable from the app tree.

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

- [x] **S7 (content KPIs)** — Dashboard home wired to `getDashboardKpis` (`/admin/(authed)/dashboard/page.tsx`): post/page counts by status, "recently updated posts" table, empty state with CTA to create the first post.
- [x] **S7 (media KPI)** — Media-storage KPI (file count + total bytes) added via `getMediaStorageStats` from the `media` module; composed in the dashboard page. Cross-module composition happens in the page (allowed) — no content↔media infra coupling.

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

- [x] **S14** — Category CRUD (name, slug, description, optional parent) + posts-per-category count. Parent cycle-prevention enforced in `saveCategory` (a category cannot be its own parent or one of its own descendants); description field wired in both the create and edit forms.
- [x] **S15** — Tag CRUD (name, slug, description) + posts-per-tag count. Description field wired in both the create and edit forms.

### Media Library

- [x] **S16** — Media upload: multi-file via `POST /api/media` (session-guarded inside the handler, since `/api/*` is outside the middleware matcher) consuming `uploadMedia`. UI is a file-picker dropzone client component on `/admin/media`. Drag-and-drop styling deferred — the component accepts multiple files via the native picker (works on all devices).
- [x] **S17** — Media grid at `/admin/media` with search + type filter (images/videos/audio/documents), thumbnails, file size.
- [x] **S18** — Media detail at `/admin/media/[id]`: preview, alt text + caption form, usage references across posts/pages (resolved to titles + edit links), delete with usage guard, file metadata (URL, storage key).

### Site Settings

- [x] **S19** — General settings at `/admin/settings`: site title, description, logo/favicon media IDs, timezone, base URL. `updateSettings` refactored to accept a `Partial<SiteSettings>` so the SEO panel can update only the meta fields without clobbering the rest.

### Account / Profile

- [x] **S20** — `/admin/account` profile form (name, email, avatar media ID) consuming `updateProfile`, resolved from the session cookie.
- [x] **S21** — `/admin/account` change-password form (current, new, confirm) consuming `changePassword`.

### Navigation Menus

- [x] **S22** — Menu CRUD at `/admin/menus` (list, create, delete) consuming `saveMenu`/`deleteMenu`.
- [x] **S23** — Menu editor at `/admin/menus/[id]`: nested items (post/page/category/custom URL), label editing, move up/down, add child, remove. Client component serializes a tree to JSON; `saveMenuItems` was refactored to accept a nested `MenuItemDraft[]` and flatten it with correct parent/child ids in the application layer. **Deviation:** drag-and-drop replaced by up/down buttons (more robust and keyboard-accessible); the JSON payload is validated with a `zod` recursive schema in the Server Action. Drag-and-drop could be layered on later without touching the use case.

### SEO Panel

- [x] **S24** — Default SEO settings (fallback meta title/description) at `/admin/seo`, saved via `updateSettings` (partial update).
- [x] **S25** — Google result preview simulator (live client-side preview as the meta title/description are typed).
- [x] **S26** — Sitemap status panel: last-generation timestamp, "Regenerate now" (`touchSitemap`) and a link to `/sitemap.xml`. New public route `src/app/sitemap.xml/route.ts` emits published posts/pages; it calls `touchSitemap` on every GET and is `force-dynamic`.

### Audit Log

- [x] **S27** — New `audit` module (`src/modules/audit`): `AuditEvent` domain type, `AuditRepository` port, `AuditEventWriter` outbound port, Prisma adapter, `recordAuditEvent` + `listAuditEvents` use cases, composition root, unit tests. The writer is threaded through owning modules' use cases via their factories and records: auth (setup, login/login_failed/login_blocked, password reset/changed), content (post created/updated/published/deleted, page deleted, category/tag deleted, settings updated, sitemap regenerated, menu created/updated/deleted/items saved), media (uploaded/deleted). Deletions and publishes carry the actor id (resolved from the session cookie in Server Actions).
- [x] **S28** — Audit log viewer at `/admin/audit-log`: read-only table (when, actor, event, entity, details) with filters for search, event type, and date range; human-readable event labels.

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
- [x] Dashboard with content + media-storage KPIs
- [x] Post management (list, create/edit, preview, bulk — categories/tags/images picker fields deferred)
- [x] Category / Tag management
- [x] Media library with usage guard
- [x] Site settings
- [x] Account/profile management
- [x] Navigation menus
- [x] SEO panel
- [x] Audit log (write path + viewer)

---

_This backlog is a living planning document. Update statuses as stories are delivered; once the epic
ships, consider splitting it the way the reference template does (backlog vs. as-built sequence)._
