# Content Types — Media Fields — Implementation Sequence

**Target milestone:** v0.4.0

Follow the order below. Each step ends with a green gate (`npm test`, `npm run lint`,
`npm run typecheck`, `npm run build`).

---

## Phase 1 — Domain

1. `src/modules/content/domain/content-types.ts` — extend `ContentFieldType` union with `"media"`.
2. `src/modules/content/domain/content-type-fields.ts` — add `mediaCoercer` (uses
   `isObjectId` from `src/shared/db/object-id.ts`) and register it in `FIELD_COERCERS`.
3. `src/modules/content/domain/content-type-fields.test.ts` — extend `isContentFieldType`
   test to include `"media"`, and add `FIELD_COERCERS.media` tests.

## Phase 2 — Usage lookup extension

4. `src/modules/media/domain/types.ts` — replace the inline union on
   `MediaUsageLookup.findUsages` return with a named `MediaUsageReference` type that includes
   `{ type: "entry"; id: string }`.
5. `src/modules/content/infrastructure/prisma-content-type-repositories.ts` — export
   `findEntryIdsUsingMedia(mediaId)`: query `ContentEntry.findMany({ where: { fields: { ... } } })`,
   filter by `ObjectId` hex in JS (the `fields` field is `Json`; same approach the existing
   `findPostIdsUsingMedia` uses for body scanning).
6. `src/modules/media/infrastructure/content-usage-lookup.ts` — accept the third dep and
   concatenate the entry ids.
7. `src/app/_lib/modules.ts` — wire `findEntryIdsUsingMedia` from the content infra into the
   content usage lookup factory call.

## Phase 3 — Application tests

8. `src/modules/media/application/use-cases/media.test.ts` — add a case where the mocked
   lookup returns an `entry` reference and `deleteMedia` refuses.
9. (Optional) Add a `validateEntryFields` test for a `media` field with a valid hex id and
   with a malformed value.

## Phase 4 — Admin form

10. `src/app/admin/(authed)/content-types/_components/content-entry-form.tsx` — when
    `field.type === "media"`, render a picker that lists the first 30 media assets (searchable)
    and lets the admin click one. Store `fields[field.name]` as a string id. Show a 50×50
    thumbnail preview if an asset is selected.
11. `src/app/admin/(authed)/content-types/[type]/entries/page.tsx` — pass the `media` field
    definition to the entry list so a thumbnail column can be shown (optional — only if a
    media field exists).

## Phase 5 — Public render

12. `src/app/(site)/types/[type]/[slug]/page.tsx` — after fetching the entry, walk
    `entry.fields`, collect media-id values whose type is `media`, resolve them through
    `media.getMediaById`, and pass a `Map<fieldName, MediaAsset | null>` to the view.
13. `src/app/(site)/types/_components/content-entry-view.tsx` — accept the map; render
    `next/image` for present assets and a placeholder div for null.

## Phase 6 — Doc sync & release

14. Update `tasks/tycoma-content-types-media-fields-backlog.md` (mark Done).
15. `CHANGELOG.md` — add `[v0.4.0]` entry.
16. `README.md` — promote *Current state* to `v0.4.0`; add `docs/releases/v0.4.0.md` to the
    documentation table; add `v0.4.0.md` line.
17. `docs/releases/v0.4.0.md` — release notes.
18. Commit, push, wait CI, `git tag -a v0.4.0 -m "..."`, push.
19. Save session notes.
