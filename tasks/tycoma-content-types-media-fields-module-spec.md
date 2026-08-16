# Content Types — Media Fields — Module Spec

## Domain extension (`src/modules/content/domain/content-types.ts`)

```ts
type ContentFieldType = "text" | "longtext" | "number" | "boolean" | "date" | "media";
```

A `media` field's value is a **string** (the mediaId). Validation rejects anything that is not
a 24-character lowercase or uppercase hexadecimal string. Existence is **not** checked at save
time — that is the renderer's job, and the usage lookup uses the same regex when scanning JSON.

The coercer delegates to a new `mediaCoercer` that imports `isObjectId` from
`src/shared/db/object-id.ts`. The shared module is already a pure helper with no framework
imports — safe for the domain layer.

## Field coercer (`src/modules/content/domain/content-type-fields.ts`)

```ts
const mediaCoercer: FieldCoercer = (raw) =>
  typeof raw === "string" && isObjectId(raw) ? raw : undefined;

FIELD_COERCERS.media = mediaCoercer;
```

`isContentFieldType("media")` becomes `true` automatically because the registry check uses
`value in FIELD_COERCERS`.

## Usage lookup extension (`src/modules/media/domain/types.ts`)

```ts
export type MediaUsageReference =
  | { type: "post"; id: string }
  | { type: "page"; id: string }
  | { type: "entry"; id: string };

export type MediaUsageLookup = {
  findUsages(mediaId: string): Promise<MediaUsageReference[]>;
};
```

The `deleteMedia` use case already only checks `usages.length > 0` — it does not branch on
`type`. Adding `entry` is invisible there.

## Content-side adapter (`src/modules/media/infrastructure/content-usage-lookup.ts`)

`createContentUsageLookup` gains a third dep:

```ts
deps: {
  findPostIdsUsingMedia(mediaId: string): Promise<string[]>;
  findPageIdsUsingMedia(mediaId: string): Promise<string[]>;
  findEntryIdsUsingMedia(mediaId: string): Promise<string[]>;
}
```

`findEntryIdsUsingMedia` lives in the **content** module (where the Prisma client is already
wiring the other two via `src/modules/content/infrastructure/prisma-content-type-repositories.ts`)
and is injected through `src/app/_lib/modules.ts` like the existing two. The MongoDB query
scans `ContentEntry.fields` with a JS-side filter after fetching candidate entries (the same
shape `findPostIdsUsingMedia` uses for the body string).

## Composition (`src/app/_lib/modules.ts`)

The wiring already injects `findPostIdsUsingMedia` and `findPageIdsUsingMedia` from
`content` → `media.infrastructure.contentUsageLookup`. Add the same wiring for
`findEntryIdsUsingMedia`.

## Admin form (`src/app/admin/(authed)/content-types/_components/content-entry-form.tsx`)

When `field.type === "media"`, render:

1. A select-style picker: a button that opens the existing media library grid in a dialog
   (reuse the `/admin/media` selection pattern; for v0.4.0 a simpler inline grid with search
   is acceptable — pick from `/admin/media?selectable=1` is acceptable).
2. The selected asset's id is stored in `fields[field.name]` (string).
3. A small thumbnail preview (50×50) using `next/image` when an asset is selected.
4. A clear button.

For **v0.4.0** the picker is intentionally minimal: a Server Component that fetches the
first 30 media assets by `createdAt desc`, lets the admin click one, and submits the form
with the asset id. A richer modal-based picker can land later without changing the shape.

## Public render (`src/app/(site)/types/[type]/[slug]/page.tsx` + view)

The composition root in `src/app/_lib/modules.ts` exposes both `content.listPublishedEntriesByTypeSlug`
and `media.getMediaById`. The page:

1. Fetches the entry via the content use case.
2. Walks `entry.fields` for keys whose type is `"media"` (the content type definition is fetched
   too) and resolves each value through `media.getMediaById`.
3. Builds a `Map<fieldName, MediaAsset | null>` and passes it to the view.

`src/app/(site)/types/_components/content-entry-view.tsx` receives the map and renders:

- `MediaAsset` → `next/image` with `alt` from the asset's metadata.
- `null` → a `<div class="media-unavailable">` placeholder labelled
  *"Mídia indisponível"*.

The entry **never** `notFound()`s because of a missing media asset — only because the entry
itself is missing or unpublished.

## Tests

- `src/modules/content/domain/content-type-fields.test.ts` — extend the FIELD_COERCERS suite
  with `media` cases.
- `src/modules/media/application/use-cases/media.test.ts` — add a case where the usage
  lookup returns an `entry` reference and `deleteMedia` refuses.
