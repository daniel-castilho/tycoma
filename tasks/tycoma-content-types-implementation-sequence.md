# Content Types — Implementation Sequence

**Target milestone:** v0.3.0

Follow the order below. Each step ends with a green gate (`npm test`, `npm run lint`, `npm run typecheck`, `npm run build`).

---

## Phase 1 — Data model & domain

1. Prisma schema: `ContentType` (id, name, slug `@unique`, description?, fields `Json`, timestamps) and `ContentEntry` (id, contentTypeId, slug, title, status, fields `Json`, publishedAt?, scheduledAt?, timestamps) with `@@unique([contentTypeId, slug])`.
2. `npm run prisma:generate` and `npm run prisma:push`.
3. Domain types + ports in `src/modules/content/domain/content-types.ts` (zero framework imports):
   - `ContentFieldType = "text" | "longtext" | "number" | "boolean" | "date"`
   - `ContentTypeField { name, label, type, required }`
   - `ContentType`, `ContentEntry`, `ContentEntryWrite`
   - `ContentTypeRepository`, `ContentEntryRepository` (Reader/Writer split per ISP convention)
4. Field/entry validation helper (pure): `validateEntryFields(type, fields)` returning errors.

## Phase 2 — Application use cases

Create `src/modules/content/application/use-cases/content-types.ts` (factories, `Result`):

- `createListContentTypes`, `createSaveContentType` (slug uniqueness; create/update), `createDeleteContentType` (blocked while entries exist)
- `createListEntries` (by typeId + status), `createGetEntry`, `createCreateEntry`, `createUpdateEntry`, `createPublishEntry`, `createDeleteEntry`
- Public: `createListPublishedEntriesByTypeSlug`, `createGetPublishedEntryByTypeAndSlug`

Wire into `src/modules/content/application/index.ts` with the audit writer.

## Phase 3 — Infrastructure

`src/modules/content/infrastructure/prisma-content-type-repositories.ts` with `toDomain`/`toPersistence` mappers for type + entry.

## Phase 4 — Admin UI

- `_actions/content-types.ts` (Zod-validated server actions, `requireSession`)
- Routes under `/admin/content-types`: list, `/new`, `/[typeId]` (edit type), `/[typeId]/entries`, `/entries/new`, `/entries/[entryId]`
- `_components/content-type-form.tsx`, `content-entry-form.tsx` (dynamic fields from the type definition), `data-table` reuse
- Add nav item in `(authed)/layout.tsx`
- Proxy already guards `/admin/**` — no matcher change needed

## Phase 5 — Public UI

- Routes `/types/[type]/page.tsx` (index) + `/types/[type]/[slug]/page.tsx` (detail) with `generateMetadata`, `notFound()` for missing/unpublished
- `_components` for rendering fields generically

## Phase 6 — Tests & docs

- `content-types.test.ts` (application, mocks ports only)
- Backlog checkboxes → Done; README roadmap + CHANGELOG + `docs/releases/v0.3.0.md` when milestone DoD met