# Content Types — Backlog Status

**Companion documents:** `tycoma-content-types-module-spec.md` · `tycoma-content-types-implementation-sequence.md`

**Document status:** Living — mark stories as they land.

**Epic goal:** Let the single admin define **custom content types** (beyond Post/Page) with a fixed set of field kinds, manage entries for them in the backoffice, and render published entries on the public site — all within the existing hexagonal `content` module.

**Prerequisite:** Admin Dashboard (`v0.1.0`) and Public Site MVP (`v0.2.0`) are shipped.

---

## Scope Summary

| Lane                      | Priority | Status | Notes                                             |
| ------------------------- | -------- | ------ | ------------------------------------------------- |
| Content type definitions  | Essential | Done   | name, slug, description, field list               |
| Field kinds               | Essential | Done   | text, longtext, number, boolean, date             |
| Entry management (admin)  | Essential | Done   | list / create / edit / delete / publish           |
| Public reading            | Essential | Done   | `/types/[type]` index + `/types/[type]/[slug]`    |
| Metadata / SEO            | Essential | Done   | per-entry title/meta via settings defaults        |
| Media-typed fields        | Deferred  | Out    | requires usage-lookup scanning of JSON fields     |
| Block-based rich fields   | Deferred  | Out    | consistent with Post/Page body (preformatted)     |

---

## Planned Stories

### Content type definitions

- [x] **CT1** — `ContentType` model + domain type: id, name, slug, description, `fields` (JSON).
- [x] **CT2** — Field kinds validated: `text`, `longtext`, `number`, `boolean`, `date`; each has `name`, `label`, `required`.
- [x] **CT3** — Repository ports + Prisma adapter + `toDomain`/`toPersistence` mappers.
- [x] **CT4** — Use cases: list, save (create/update, slug uniqueness), delete (blocked while entries exist).

### Entry management (admin)

- [x] **CT5** — `ContentEntry` model + domain type: contentTypeId, slug, title, status, `fields` (JSON), dates.
- [x] **CT6** — Repository ports + Prisma adapter; slug unique per content type.
- [x] **CT7** — Use cases: list (by type + filters), get, create, update, publish, delete; fields validated against the type definition.
- [x] **CT8** — Server actions (`_actions/content-types.ts`) with Zod validation + `requireSession`.
- [x] **CT9** — Admin UI: types list/new/edit, entries list/new/edit, dynamic field form.

### Public reading

- [x] **CT10** — Public use cases: published entries by type slug; single published entry by type+slug.
- [x] **CT11** — Public routes: `/types/[type]` (index) and `/types/[type]/[slug]` (detail) with metadata; missing/unpublished → `notFound()`.
- [x] **CT12** — Unit tests for every new application behaviour.

---

## Explicitly Out of Scope

- Media-typed fields (deferred — requires scanning JSON fields in the media usage lookup).
- Block-based rich editing / repeating groups.
- Permissions beyond single-admin (no multi-user).
- Changing Post/Page semantics.
- Prisma 7 upgrade.

---

## Definition of Done (epic)

- [x] Admin can define content types with a fixed field list
- [x] Admin can manage entries (create/edit/publish/delete) for any content type
- [x] Published entries render on `/types/...` public routes; drafts never leak
- [x] Metadata is set per public route
- [x] Hexagonal boundaries respected (domain/application zero framework imports; composition in `application/index.ts` + `src/app/_lib/modules.ts`)
- [x] `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` pass
- [x] Backlog statuses updated to match reality