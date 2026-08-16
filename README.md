# Tycoma — Tyny Content Manager

Single-tenant CMS with a single administrator, built as a **modular monolith** with **hexagonal
architecture** (ports & adapters). Each business module is self-contained enough to be extracted
into a service later with minimal impact.

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict)
- **Prisma 6** + **MongoDB** (replica set — required for transactions). Pinned to 6.x because Prisma
  ORM 7 dropped MongoDB support (no `@prisma/adapter-mongodb` exists yet).
- **Redis** (`ioredis`) — rate limiting, cache
- **jose** — JWT sessions (httpOnly cookie)
- **@node-rs/argon2** — Argon2id password hashing
- **zod** — input validation
- **Node.js 24.x**

## Architecture

Every business module under `src/modules/<feature>/` follows the same layout:

```
src/modules/<feature>/
├── domain/           Entities, value objects & outbound port interfaces (zero framework imports)
├── application/      Use-case implementations (pure TypeScript, depend only on domain ports)
│   ├── use-cases/    create<UseCase>(ports) factories returning closures
│   ├── index.ts      Composition root: wires infrastructure adapters into the use cases
│   └── edge.ts       Optional edge-safe entrypoint (no Prisma/ioredis) for the Next.js proxy
└── infrastructure/   Adapters: Prisma repositories, Redis, JWT, Argon2id, S3, mailers + mappers
```

| Area      | Responsibility                                                                   |
| --------- | -------------------------------------------------------------------------------- |
| `auth`    | Single-admin auth: setup, login, session (JWT cookie), password recovery, rate limiting, profile |
| `content` | Posts, pages, categories, tags, site settings, navigation menus, SEO defaults, dashboard KPIs |
| `media`   | Media library: upload, S3-compatible storage, metadata, usage lookups            |
| `shared`  | Cross-cutting kernel (`result`, `slug`) + framework glue (Prisma, Redis clients) |
| `app`     | Next.js App Router composition root: admin backoffice (`/admin/**`) + public site (`/(site)/**`); `src/proxy.ts` guards admin routes |

**Boundary rules:**

- `domain/` and `application/` never import framework or infrastructure code.
- Modules depend on each other **only** through `domain/` port interfaces.
- No direct Prisma / Redis / JWT / Argon2 usage outside `infrastructure/`.

## Requirements

- Node.js 24.x
- Docker — MongoDB (replica set), Redis and LocalStack (S3) are defined in `docker-compose.yml`

## Getting started

```bash
cp .env.example .env   # set AUTH_SECRET, and S3_* credentials as needed
npm install
npm run docker:up      # MongoDB (replica set) + Redis + LocalStack S3
npm run prisma:generate
npm run prisma:push    # sync schema to MongoDB (dev only)
npm run dev
```

Open <http://localhost:3000/admin/setup> to create the first (and only) admin account, then log in
at `/admin/login`.

## Commands

| Purpose                          | Command                                     |
| -------------------------------- | ------------------------------------------- |
| Dev server                       | `npm run dev`                               |
| Production build                 | `npm run build`                             |
| Start production                 | `npm run start`                             |
| Lint                             | `npm run lint`                              |
| Type-check                       | `npm run typecheck`                         |
| Unit tests (fast, no Docker)     | `npm test`                                  |
| Docker services (Mongo/Redis/S3) | `npm run docker:up` / `npm run docker:down` |
| Prisma generate                  | `npm run prisma:generate`                   |
| Prisma push (dev only)           | `npm run prisma:push`                       |
| Prisma Studio                    | `npm run prisma:studio`                     |

## Testing

`npm test` runs the Node.js built-in test runner
(`node --import ./scripts/test-register.mjs --experimental-strip-types --test src/**/*.test.ts`).
The custom resolver registers the `@/*` path alias declared in `tsconfig.json` so application
imports stay clean. Domain tests use no mocks; application tests mock the domain ports only.
After significant changes run `npm run build` and smoke-test against `npm run docker:up`.
Full testing guidance: [docs/testing-playbook.md](docs/testing-playbook.md).

## Current state

**`v0.6.0` is the latest tagged release.** It is the **Security Hardening Phase B** epic —
shrinks the session-theft window, adds step-up re-auth for sensitive actions, broadens rate
limiting, and implements a progressive lockout policy. **No new npm dependencies.** 2FA is
deliberately deferred pending human approval of a TOTP library.

- **v0.6.0 (Security Hardening Phase B):**
  - Default session lifetime: **`7d` → `12h`**. JWT `exp` and cookie `maxAge` aligned.
  - **Step-up re-auth** for `change_password`: a Redis-backed `stepup:{userId}` marker
    with a **10-minute TTL**, time-boxed reuse (not consumed); the admin UI prompts for
    the current password before the change-password form.
  - **Rate limit on `POST /api/media`**: 30 / 15 min per `(userId, ip)`; returns `429`
    on excess.
  - **Rate limit on `change_password`**: 5 / 15 min per user id.
  - **Progressive lockout**: 10 failures within 1 hour for an `(ip, email)` pair triggers
    a **30-minute extended block**; successful login resets the counter and clears any
    block. Audit events include `failures` and `extended_block` flags.
  - Sliding session / remember-me / 2FA: **deferred** (Phase B+).
  - Zero new npm dependencies.

- **v0.5.0 (Security Hardening Phase A):**
  - Security response headers on every response: `X-Content-Type-Options: nosniff`,
    `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`,
    `Permissions-Policy` (no camera/mic/geo), and a strict
    `Content-Security-Policy-Report-Only` baseline (`default-src 'self'`, no `unsafe-eval`,
    S3 host allowed for images/connect). `Strict-Transport-Security` is sent only in
    production over HTTPS.
  - `AUTH_SECRET` production policy: ≥ 32 chars, no documented placeholders, no
    leading/trailing whitespace. Dev/test keep the 16-char minimum.
  - Session cookie attributes explicit and tested (`httpOnly`, `secure` in production,
    `sameSite: lax`, `path: /`, 7-day `maxAge`); logout uses matching attributes.
  - Media upload hardening: 10 MiB max, MIME allowlist (jpeg/png/webp/gif), magic-byte
    sniffing that must match the declared type, **SVG blocked by both MIME and
    extension**, server-generated storage keys.
  - Stored XSS defence: the public site renders body as plain text; a regression test
    fails if anyone introduces `dangerouslySetInnerHTML` without a sanitizer.

- **v0.4.0 (media-typed fields):**
  - Domain: `ContentFieldType` gains `"media"` with an ObjectId-hex coercer (delegates to
    `isObjectId` in `src/shared/db/object-id.ts`).
  - `MediaUsageReference` union includes `{ type: "entry"; id: string }`; `deleteMedia`
    blocks deletes referenced by content entries.
  - Admin: `content-entry-form.tsx` renders a `<select>` of image media assets for `media`
    fields, with a `next/image` 50×50 preview next to the selected option.
  - Public: `/(site)/types/[type]/[slug]/page.tsx` resolves media field values through
    `media.getMedia`; missing assets render a `<em>Mídia indisponível</em>` placeholder —
    the entry never 404s for a missing media.

- **v0.3.1 (lockfile + doc-sync rule):** refreshed `package-lock.json` to match the dep
  graph grown by the `v0.3.0` Prisma models, and codified the rule that every `npm install`
  which mutates the lockfile must commit it in the same change set (`AGENTS.md` rule 10,
  `docs/lessons.md`).

- **Admin Dashboard (v0.1.0):**
  - **Foundation & access control:** setup, login, session guard (`src/proxy.ts`), password
    recovery, rate limiting, profile/change-password.
  - **Core content management:** dashboard KPIs (content + media storage), posts, pages, taxonomy
    (categories/tags with parent cycle guard and descriptions). Settings & menu use cases exist
    with admin screens.
  - **Media:** multi-file upload via `POST /api/media`, media grid with search/filter, metadata
    editing, usage guard on delete.
  - **Site structure/SEO:** site settings, navigation menus (nested items, post/page/category/
    custom URL), SEO defaults with Google preview, and `/sitemap.xml`.
  - **Monitoring:** audit module with `AuditEventWriter` threaded through the
    `content`/`auth`/`media` use cases; read-only audit log viewer with filters at
    `/admin/audit-log`.
- **Public Site (v0.2.0 + post-tag follow-ups on `main`):**
  - Public layout shell driven by settings + navigation menu, with `SiteHeader` / `SiteFooter` /
    `PostCard` components and the favicon served from `settings.faviconMediaId`.
  - Home `/` listing published posts; `/posts` full index (newest first).
  - Post detail `/posts/[slug]` and page detail `/[slug]` (top-level) — published-only, with
    `generateMetadata`, canonical URLs, `ogImage`, featured images, and a page-hierarchy
    breadcrumb for published ancestors.
  - Category/tag index + detail pages; friendly 404 for missing/unpublished slugs.
  - New published-only read use cases in the `content` module (see
    `src/modules/content/application/use-cases/public.ts`); public site stays a pure composition
    layer.
- **Custom Content Types (v0.3.0):**
  - Admin defines content types (`/admin/content-types`) with name, slug, description and a
    fixed list of fields (text, longtext, number, boolean, date — each with `name`, `label`,
    `required`).
  - Per-type entries (`/admin/content-types/[type]/entries`) with create / edit / publish /
    delete; slug is unique per type; field values validated and coerced by the type's definition.
  - Public reading at `/types/[type]` (index) and `/types/[type]/[slug]` (detail) with
    `generateMetadata`, canonical URL, and a generic field renderer; drafts and missing slugs
    return `notFound()`.

> **Known technical debt:** none. The items recorded at `v0.1.0` (`asStatus` silent degradation and
> the wide content repository interfaces) were resolved — see `AGENTS.md` for the details.

## Roadmap

The original implementation sequence planned the Admin Dashboard as separate milestones; in
practice all five phases shipped together as **`v0.1.0`**, followed by the **Public Site MVP** as
**`v0.2.0`**, then **Custom Content Types** as **`v0.3.0`**. The public-site follow-ups (posts
index, page breadcrumb, extracted components, favicon from settings) shipped as **`v0.2.1`**;
the lockfile refresh and doc-sync rule shipped as **`v0.3.1`**; media-typed fields for content
types shipped as **`v0.4.0`**; the Security Hardening Phase A epic shipped as **`v0.5.0`**; the
Security Hardening Phase B epic shipped as **`v0.6.0`**.

Deliberately deferred: block-based editor, Markdown rendering on the public site, public headless
API, webhooks, comments, 301 redirects, revision history, automated backup/export scheduling,
multi-user roles, **Security Hardening Phase C** (TOTP 2FA with a human-approved library,
sliding session / refresh redesign, full CSP enforce pipeline, private-bucket signed URLs,
destructive-delete step-up).

## Documentation

| Document                                                                     | Purpose                                                       |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [AGENTS.md](AGENTS.md)                                                       | Rules for AI agents and human contributors                    |
| [docs/lessons.md](docs/lessons.md)                                           | Durable lessons learned                                       |
| [docs/coding-standards.md](docs/coding-standards.md)                         | Day-to-day coding standards (TypeScript/Next.js/Prisma)       |
| [docs/testing-playbook.md](docs/testing-playbook.md)                         | Testing pyramid, patterns, regression checklist & smoke        |
| [docs/twelve-factor.md](docs/twelve-factor.md)                               | Twelve-Factor App reference & compliance matrix               |
| [docs/releases/v0.1.0.md](docs/releases/v0.1.0.md)                           | Release notes — admin dashboard                               |
| [docs/releases/v0.2.0.md](docs/releases/v0.2.0.md)                           | Release notes — public site MVP                               |
| [docs/releases/v0.2.1.md](docs/releases/v0.2.1.md)                           | Release notes — public-site follow-ups + doc sync rule        |
| [docs/releases/v0.3.0.md](docs/releases/v0.3.0.md)                           | Release notes — custom content types                          |
| [docs/releases/v0.3.1.md](docs/releases/v0.3.1.md)                           | Release notes — lockfile refresh & doc-sync rule              |
| [docs/releases/v0.4.0.md](docs/releases/v0.4.0.md)                           | Release notes — media-typed fields for content types           |
| [docs/releases/v0.5.0.md](docs/releases/v0.5.0.md)                           | Release notes — security hardening phase A                     |
| [docs/releases/v0.6.0.md](docs/releases/v0.6.0.md)                           | Release notes — security hardening phase B                     |
| [tasks/tycoma-admin-dashboard-backlog.md](tasks/tycoma-admin-dashboard-backlog.md) | Admin Dashboard epic — stories & scope                 |
| [tasks/tycoma-admin-dashboard-implementation-sequence.md](tasks/tycoma-admin-dashboard-implementation-sequence.md) | Admin Dashboard epic — delivery order & DoD |
| [tasks/tycoma-admin-dashboard-module-spec.md](tasks/tycoma-admin-dashboard-module-spec.md) | Admin Dashboard epic — target technical design |
| [tasks/tycoma-ai-software-engineer-prompt-admin-dashboard.md](tasks/tycoma-ai-software-engineer-prompt-admin-dashboard.md) | AI-engineer prompt used for the Admin Dashboard epic |
| [tasks/tycoma-public-site-backlog.md](tasks/tycoma-public-site-backlog.md)   | Public Site epic — stories & scope                            |
| [tasks/tycoma-public-site-implementation-sequence.md](tasks/tycoma-public-site-implementation-sequence.md) | Public Site epic — delivery order & DoD                |
| [tasks/tycoma-public-site-module-spec.md](tasks/tycoma-public-site-module-spec.md) | Public Site epic — target technical design              |
| [tasks/tycoma-ai-software-engineer-prompt-public-site.md](tasks/tycoma-ai-software-engineer-prompt-public-site.md) | AI-engineer prompt used for the Public Site epic     |
| [tasks/tycoma-content-types-backlog.md](tasks/tycoma-content-types-backlog.md) | Content Types epic — stories & scope                        |
| [tasks/tycoma-content-types-implementation-sequence.md](tasks/tycoma-content-types-implementation-sequence.md) | Content Types epic — delivery order & DoD          |
| [tasks/tycoma-content-types-module-spec.md](tasks/tycoma-content-types-module-spec.md) | Content Types epic — target technical design            |
| [CHANGELOG.md](CHANGELOG.md)                                                 | High-level release index                                      |