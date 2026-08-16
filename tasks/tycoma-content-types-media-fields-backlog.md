# Content Types — Media Fields — Backlog Status

**Companion documents:** `tycoma-content-types-media-fields-module-spec.md` ·
`tycoma-content-types-media-fields-implementation-sequence.md`

**Document status:** Living — mark stories as they land.

**Epic goal:** Extend the **Custom Content Types** feature (`v0.3.0`) with a new field kind
(`media`) so an entry can reference an asset uploaded in the media library. Includes the
admin picker, public rendering, and the missing piece of the media usage lookup so the
existing **delete-guard** also sees entries.

**Prerequisite:** Admin Dashboard (`v0.1.0`), Public Site MVP (`v0.2.0`), and Custom Content
Types (`v0.3.0`) are shipped.

---

## Scope Summary

| Lane                              | Priority | Status | Notes                                            |
| --------------------------------- | -------- | ------ | ------------------------------------------------ |
| `media` field kind                | Essential | Done   | value = mediaId (string)                         |
| Admin picker + thumb in form      | Essential | Done   | `<select>` listing image media + 50×50 preview  |
| Public render with placeholder    | Essential | Done   | null asset → "Mídia indisponível" (no 404)       |
| Entry references in usage lookup  | Essential | Done   | blocks `deleteMedia` while an entry references it |
| ObjectId hex validation           | Essential | Done   | 24-char hex string, no repo query at save time   |

---

## Planned Stories

- [x] **MF1** — Domain: extend `ContentFieldType` with `"media"`; add coercer that accepts a
      24-char hex string (existing `isObjectId` in `src/shared/db/object-id.ts`); ensure
      `isContentFieldType("media")` returns `true`.
- [x] **MF2** — Domain: extend `MediaUsageLookup.findUsages` result type with
      `{ type: "entry"; id: string }` so `deleteMedia` can block deletes referenced by entries.
- [x] **MF3** — Infrastructure: add `findEntryIdsUsingMedia(mediaId)` to the content-side
      usage lookup that scans `ContentEntry.fields` JSON; wire it into
      `createContentUsageLookup` so the lookup also returns entries.
- [x] **MF4** — Composition: thread the new dep through
      `src/app/_lib/modules.ts` → `media.application` → `media.infrastructure`.
- [x] **MF5** — Admin form: render a media picker for `media` fields in
      `content-entry-form.tsx` (native `<select>` listing image media with a 50×50 preview
      when an asset is selected).
- [ ] **MF6** — Admin entry list: thumbnail column when the type has a `media` field.
      *Deferred — not required for the public reading flow. Tracked under "Feature backlog"
      below.*
- [x] **MF7** — Public render: composition layer resolves the entry's media field ids through
      `media.getMedia`; view receives `MediaAsset | null` per media field. When `null`,
      render a labelled placeholder ("Mídia indisponível") — never `notFound()` the entry.
- [x] **MF8** — Tests:
  - Domain: `media` coercer accepts valid ObjectId strings; rejects non-hex, non-24-char,
    non-string values; `isContentFieldType("media")` is true.
  - Domain: `validateEntryFields` for a media field with valid + invalid values.
  - Application: `deleteMedia` blocks when an entry references the asset (mocked lookup).

---

## Explicitly Out of Scope

- Multiple-media-per-field (repeater / array). Each `media` field holds exactly one mediaId.
- Block-based rich editing / repeating groups (still deferred from `v0.3.0`).
- Permissions beyond single-admin (no multi-user).
- Changing Post/Page semantics.
- Prisma 7 upgrade.
- MF6 (admin entry-list thumbnail column) — deferred to a follow-up. The admin entry detail
  already shows the selected thumbnail next to the picker.

---

## Definition of Done (epic)

- [x] Admin can add a `media` field to a content type and pick an existing asset
- [x] Public detail page renders the referenced asset via `next/image` (or placeholder if missing)
- [x] `deleteMedia` refuses to delete an asset referenced by a content entry (with a clear error)
- [x] Hexagonal boundaries respected (content domain/application never imports media infra)
- [x] `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` pass
- [x] Backlog statuses updated to match reality
- [x] Doc sync per AGENTS.md rule 9: README Current State, CHANGELOG, this backlog,
      AGENTS.md Known technical debt, `docs/lessons.md` if a durable rule is learned
