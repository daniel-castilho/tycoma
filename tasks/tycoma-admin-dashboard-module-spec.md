# Admin Dashboard Module — Technical Specification (Target Design)

**Status:** Planning — this is the intended design, to be validated as the module is built.
**Companion docs:** `tycoma-admin-dashboard-backlog.md` · `tycoma-admin-dashboard-implementation-sequence.md` · `tycoma-ai-software-engineer-prompt-admin-dashboard.md`

---

## 1. Purpose & Architectural Role

`admin-dashboard` is a **composition layer**. It does **not** own business rules, domain entities, or
Prisma models for posts, pages, categories, tags, media, settings, menus, or users.

It:

- Composes use cases exposed by the `content`, `media`, and `auth` modules
- Provides the authenticated, single-admin UI under `/admin/**` (Next.js App Router)
- Owns only presentation DTOs and, later, any export-specific adapters (out of scope for v1)

**Hard rules (to be enforced by lint/boundary rules — see §6):**

- Zero business rules inside the admin app tree
- Import only a module's `application` layer (use cases), never another module's
  `infrastructure` (Prisma repositories, Redis clients, storage adapters) directly
- Every route under `/admin/**` is protected by the session guard/middleware

---

## 2. Package Layout (target)

Builds on the structure already created by `setup-tycoma.sh`:

```
src/
├── modules/
│   ├── content/
│   │   ├── domain/            → Post, Page, Category, Tag entities + repository interfaces
│   │   ├── application/
│   │   │   └── use-cases/     → CreatePost, PublishPost, ListPosts, CreatePage, ...
│   │   └── infrastructure/    → PrismaPostRepository, PrismaPageRepository, ...
│   ├── media/
│   │   ├── domain/            → Media entity + repository interface
│   │   ├── application/
│   │   │   └── use-cases/     → UploadMedia, ListMedia, DeleteMedia, ...
│   │   └── infrastructure/    → PrismaMediaRepository, storage adapter (local/S3-compatible)
│   └── auth/
│       ├── domain/            → User, PasswordResetToken entities + repository interfaces
│       ├── application/
│       │   └── use-cases/     → CreateFirstAdmin, Login, RequestPasswordReset, ResetPassword, ...
│       └── infrastructure/    → PrismaUserRepository, session adapter (JWT/Redis), rate limiter
├── shared/
│   ├── kernel/                → cross-module types used sparingly
│   └── cache/                 → Redis client wrapper
└── app/
    ├── admin/                 → admin-dashboard: composition only, no domain logic
    │   ├── (auth)/            → /setup, /login, /forgot-password, /reset-password
    │   ├── dashboard/
    │   ├── posts/
    │   ├── pages/
    │   ├── taxonomy/          → categories, tags
    │   ├── media/
    │   ├── menus/
    │   ├── settings/
    │   ├── seo/
    │   ├── account/
    │   └── audit-log/
    ├── api/                   → route handlers where a Server Action doesn't fit (e.g. uploads)
    └── (site)/                → public, SSR/SSG rendered site
```

Presentation DTOs for the admin app (when a use case's return type needs shaping for a screen) live
under `src/app/admin/**/_dto/` or colocated with the route, not inside any module's `domain` or
`application` layers.

---

## 3. What Should Be Implemented (by area)

### Dashboard home

- KPIs composed from `content` (`ListPosts`, `ListPages` counts by status) and `media`
  (`GetMediaStorageStats` or equivalent) use cases

### Auth & access

- First-run `/setup`: guarded so it only renders/accepts submissions while `auth`'s
  `CountUsers` use case returns `0`
- `/login`: calls `auth`'s `Login` use case, sets the session cookie
- `/forgot-password` + `/reset-password`: call `RequestPasswordReset` / `ResetPassword`
- Session guard: Next.js middleware reading the session cookie, redirecting unauthenticated
  requests to `/login`

### Posts

- List with filters (status, category, date) and search — backed by `content`'s `ListPosts`
- Create/edit form — backed by `CreatePost` / `UpdatePost` / `PublishPost`
- Preview — renders the post through the same template as the public site, without persisting a
  status change
- Bulk actions — batched calls to the relevant use cases

### Pages

- List, create/edit, parent/child hierarchy — mirrors Posts, without categories/tags

### Categories & Tags

- CRUD screens backed by `content`'s taxonomy use cases; usage counts read from the same module

### Media

- Upload form (drag-and-drop) calling `media`'s `UploadMedia`
- Grid + detail panel calling `ListMedia` / `GetMediaUsage` / `DeleteMedia` (guarded when in use)

### Site settings

- Single form backed by a `GetSettings` / `UpdateSettings` use case (owning module to be confirmed
  during schema design — likely a slice of `content`, since settings feed SEO defaults and sitemap
  generation)

### Navigation menus

- Menu CRUD + drag-and-drop item ordering, backed by dedicated use cases (owning module to be
  confirmed alongside settings)

### SEO panel

- Reads/writes default SEO settings; Google preview is a pure presentation component (no backend
  call beyond the settings read); sitemap status reads generation metadata

### Account / profile

- Profile edit and change-password forms, backed by `auth`'s `UpdateProfile` / `ChangePassword`

### Audit log

- Viewer backed by an `auth`- or `shared`-owned `ListAuditEvents` use case (owning module to be
  confirmed — audit events originate from multiple modules, so this may warrant a small dedicated
  `audit` module rather than living inside `auth`)

---

## 4. Deliberately Deferred (v2 and beyond)

| Feature                                   | Why deferred                                                      |
| ------------------------------------------ | ------------------------------------------------------------------ |
| Custom content types                       | Significant modeling work; core CRUD needs to be solid first       |
| Block-based editor                         | Markdown/rich text ships faster; blocks are a v2 UX upgrade        |
| Public headless content API                | No consumer needs it yet for a single-tenant site                  |
| Webhooks on publish/update                 | No external system to notify yet                                   |
| Native comments                            | Often delegated to a third party (Disqus/Giscus) instead           |
| 301 redirects manager                      | Not needed until real content/slugs start changing in production   |
| Content revision history                   | Useful, but adds real modeling and storage cost                    |
| Automated backup/export scheduling         | A manual script is enough until the content volume justifies more  |
| Multi-user roles                           | Single admin for now; `User` model shouldn't block this later      |

---

## 5. UI Conventions

- Tailwind for styling; no ad-hoc inline styles or one-off color values
- Shared component set (forms, tables, modals, status badges) built once and reused across
  Posts/Pages/Media/Menus screens rather than duplicated per route
- Loading and empty states are part of the definition of done for every list screen, not an
  afterthought

---

## 6. Security

1. Every route under `/admin/**` passes through the session guard (Next.js middleware)
2. Login and password-recovery endpoints are rate-limited via Redis
3. Passwords are hashed with bcrypt; reset tokens are stored hashed, never in plaintext
4. Meaningful admin actions are recorded in the audit log (§ Phase 5 of the implementation
   sequence)
5. Boundary enforcement between `admin-dashboard` and the modules it composes should be automated —
   candidates to evaluate: `dependency-cruiser` or an ESLint import-boundaries plugin, run in CI.
   This replaces the role `ArchUnit` plays in the reference template; pick one and record the
   decision here once chosen.

---

## 7. Testing Expectations

- Unit tests for each module's use cases live inside that module, not in `admin-dashboard`
- `admin-dashboard` composition logic gets lightweight unit tests where it does more than pass
  data through (e.g., DTO shaping)
- End-to-end smoke tests for the critical admin flows (login, create/publish a post, upload media)
  are worth adding once Phase 2 lands — Playwright is a reasonable default, to be confirmed
- Boundary/lint checks run in CI once configured (see §6)

---

## 8. Open Questions

- Which module owns `Settings` and `Menu` — a slice of `content`, or a small dedicated
  `site-config` module? Decide before Phase 4.
- Which module owns audit events — `auth`, or a small dedicated `audit` module that other modules
  write to? Decide before Phase 5.
- Tool choice for architecture-boundary enforcement in CI (`dependency-cruiser` vs. ESLint plugin).

---

## 9. Definition of Done (module)

- [ ] Dashboard with real KPIs
- [ ] Post / Page management screens (including preview and scheduling)
- [ ] Category / Tag management
- [ ] Media library with usage guard
- [ ] Site settings
- [ ] Navigation menus
- [ ] SEO panel
- [ ] Account/profile management
- [ ] Audit log (write path + viewer)
- [ ] Boundary enforcement automated in CI

---

_This document describes the target design, agreed on before implementation. Once the module is
built, keep this file updated to reflect reality — or split it the way the reference template does,
keeping the original design visible in git history._
