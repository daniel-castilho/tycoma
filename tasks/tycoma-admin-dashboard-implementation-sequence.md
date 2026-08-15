# Admin Dashboard — Implementation Sequence (Planned)

**Companion docs:** `tycoma-admin-dashboard-module-spec.md` · `tycoma-admin-dashboard-backlog.md` · `tycoma-ai-software-engineer-prompt-admin-dashboard.md`

**Document status:** Planning. This records the **intended** delivery order, agreed on before any
code exists. If the real build deviates (it usually does), update this document to reflect what
actually happened, the same way the reference template distinguishes "as-built" from "original plan."

---

## Guiding principle to follow throughout

`admin-dashboard` is a **composition layer**:

- No domain entities or Prisma models of its own
- No direct database or Redis access — always through a module's `application` use case
- Depends only on `content`, `media` and `auth` modules' public interfaces (their `application`
  layer, never their `infrastructure` adapters directly)
- Thin Next.js Server Components / Route Handlers / Server Actions + presentation DTOs

Work should be delivered in vertical slices (route + composition + minimal styling + test), not as a
big upfront foundation of every DTO and port before any screen exists.

---

## Planned delivery sequence

### Phase 1 — Foundation & access control

**Target milestone:** v0.1.0

1. `User` + `PasswordResetToken` models in `auth` module (S1)
2. First-run `/setup` flow (S2)
3. Login screen + session issuance (S3)
4. Password recovery flow — request + reset (S4)
5. Session guard/middleware for `/admin/**` (S5)
6. Rate limiting on auth endpoints via Redis (S6)

**Outcome:** The admin can be created once, log in, recover a forgotten password, and every
`/admin` route refuses unauthenticated access.

---

### Phase 2 — Core content management

**Target milestone:** v0.2.0

| Area       | What ships                                                       |
| ---------- | ------------------------------------------------------------------ |
| Dashboard  | Home with real KPIs (S7)                                           |
| Posts      | List, create/edit, preview, schedule, bulk actions (S8–S11)        |
| Pages      | List, create/edit, hierarchy (S12–S13)                             |
| Taxonomy   | Category & tag CRUD with usage counts (S14–S15)                    |

Business logic (slug generation/validation, status transitions, scheduling) lives in the `content`
module's use cases. `admin-dashboard` only composes and renders.

**Outcome:** The admin can fully manage posts and pages end to end.

---

### Phase 3 — Media

**Target milestone:** v0.3.0

1. Upload (drag-and-drop, multi-file) (S16)
2. Media grid + search/filter (S17)
3. Media detail: metadata + usage guard on delete (S18)

Storage adapter (local in dev, S3-compatible in production) and file-processing logic live in the
`media` module; `admin-dashboard` only renders the library and wires the upload form to the module's
use case.

**Outcome:** The admin can upload and manage media without touching the filesystem or bucket directly.

---

### Phase 4 — Site structure & SEO

**Target milestone:** v0.4.0

| Step | Story        | Deliverable                                                         |
| ---- | ------------ | ---------------------------------------------------------------------|
| 4.1  | S19          | Site settings (title, description, logo, favicon, timezone, base URL)|
| 4.2  | S22–S23      | Navigation menus with drag-and-drop items and submenus               |
| 4.3  | S24–S26      | SEO panel: default meta fallback, Google preview, sitemap status     |

Settings are stored as key-value pairs (or a single `Settings` document) owned by a small
`settings`-flavored slice of the `content` module (to be confirmed during the schema design pass);
`admin-dashboard` never writes directly to the collection.

**Outcome:** The site has configurable identity, navigation, and default SEO behavior, all editable
from the admin.

---

### Phase 5 — Monitoring

**Target milestone:** v0.5.0

1. Audit log data model + write path, triggered from owning modules' use cases whenever a
   meaningful action occurs (S27)
2. Audit log viewer with filters (S28)

**Outcome:** Every meaningful admin action (publish, delete, settings change, login) leaves a
traceable record, even with a single admin using the system.

---

### Account / Profile

Ships alongside Phase 1, once the session mechanism exists (S20–S21): profile edit and change
password. Listed separately here because it depends on `auth` but isn't part of the initial
setup/login flow itself.

---

## Recommended order for any *new* admin feature

1. Confirm the owning module (`content`, `media`, or `auth`) already exposes — or can be extended to
   expose — the required use case. If it doesn't exist yet, add it there, not in `admin-dashboard`.
2. Add the composition logic (Server Action or Route Handler) under the admin app tree.
3. Add the page/route under `src/app/admin/**`.
4. Confirm the route is covered by the session guard (S5) — it should be, by directory convention,
   but verify.
5. Unit-test the composition logic; the owning module's use case should already have its own tests.
6. Smoke-test the page locally (`npm run dev`).
7. Update the backlog status and this sequence document if the delivery order changed.

---

## Definition of Done (sequence)

- [x] Phase 1 — Foundation & access control
- [x] Phase 2 — Core content management
- [x] Phase 3 — Media
- [x] Phase 4 — Site structure & SEO
- [x] Phase 5 — Monitoring

---

_This is the planned execution order, written before implementation starts. Once phases ship, convert
this document (or a copy of it) into an as-built record, the way the reference template does — keeping
the original plan visible in git history for comparison._
