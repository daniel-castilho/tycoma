# Lessons

Durable rules learned the hard way. Add an entry whenever a decision is made that should never be
silently reversed.

## Prisma 7 has no MongoDB support — stay pinned on Prisma 6.x

Prisma ORM 7 (released Nov 2025) moved to a driver-adapter architecture and **dropped MongoDB**:
no `@prisma/adapter-mongodb` package exists and all v7 adapters target SQL databases. A Prisma 7
scaffold fails at `prisma generate` with `P1012` ("datasource property `url` is no longer
supported") and cannot be made to work with MongoDB.

Rule: keep `prisma` and `@prisma/client` pinned to **6.x** (currently `6.19.3`) until Prisma
officially ships MongoDB support for v7. Do **not** bump to 7 on a whim — verify MongoDB support in
the release notes first.

## Node test runner cannot resolve the `@/` alias

`npm test` runs
`node --import ./scripts/test-register.mjs --experimental-strip-types --test src/**/*.test.ts`.
Node has no native knowledge of the `@/` TypeScript path alias declared in `tsconfig.json`, so any
**runtime** import of `@/...` inside a file under test fails with `ERR_MODULE_NOT_FOUND`. (`import type`
is stripped by `--experimental-strip-types`, so only value imports matter.)

Rule: keep all `import` paths — including under `application/use-cases/` — clean with the `@/`
alias. `scripts/test-resolver.mjs` is registered via `--import` before the test runner starts and
rewrites `@/...` to the matching file under `src/`. A small relative-path fallback also fills in
missing `.ts` extensions so use cases can stay alias-first without `.ts` suffixes. Adding new test
files or moving them around does not require touching the resolver.

## Cross-module ports are wired by a framework composition root

Cross-module access must go through `domain/` ports only — including at composition time. A module
that needs another module's port (e.g. `auth`/`content`/`media` writing audit events) must not
import that module's `application` or `infrastructure`, not even from its own `application/index.ts`.

Rule: every module's composition entrypoint (`application/index.ts` and, if present,
`application/edge.ts`) exposes a wiring factory that receives cross-module ports as parameters
(`createContentApplication(auditEventWriter)`, `createAuditApplication({ store, reader })`,
`createEdgeAuthApplication({ verifier })`). The framework wires them once in
`src/app/_lib/modules.ts` — which exports the wired module objects (`content`, `auth`, `media`,
`audit`) — and in edge consumers (`src/proxy.ts`, `src/app/admin/_lib/session.ts`,
`src/app/admin/(authed)/layout.tsx`). Server actions, pages and route handlers import from there.
Adding a use-case to a module only means exporting it from that module's wiring factory; a new
cross-module dependency adds a port parameter to the factory and a wire-up line in `modules.ts`.

## Hierarchical menu items: flatten the tree in the application layer

Storing nested menu items as a flat `MenuItem[]` (each row has `parentId` + `sortOrder`) means the
parent/child links reference ids that are generated at save time. Passing a flat list of client
drafts into `saveMenuItems` cannot produce valid `parentId`s because the ids are brand new.

Rule: accept a nested `MenuItemDraft[]` (children arrays) in the use case and flatten it to the
flat `MenuItem[]` inside the application layer — that is where the parent/child id assignment
belongs, not in the UI. The client editor only manages a tree of drafts; drag-and-drop can be
layered onto it later without touching the use case.
## `@node-rs/argon2` ships ambient `const enum`s that do not exist at runtime

`@node-rs/argon2` declares its `Algorithm`/`Version` types as **ambient `const enum`s**. Two traps
follow:

1. Under `isolatedModules` (the default in modern Next/TS setups), referencing
   `argon2.Algorithm.Argon2id` is a compile error (`TS2748: Cannot access ambient const enums`).
2. Even if it compiled, the runtime module exports **empty objects** for those enums — the const
   enum values are erased at compile time, so the reference would be `undefined.Argon2id`.

Rule: pass the documented member values as numeric literals typed against the library's `Options`
interface (`algorithm: 2 /* Argon2id */`, `version: 1 /* 0x13 */`). Add the values in a comment.
Use the OWASP-recommended Argon2id baseline (64 MiB memory, 3 passes, 1 lane) and remember that
`verify()` throws on a malformed encoded hash — wrap it so a corrupt stored hash degrades to a
failed login instead of a 500.

## Prisma + MongoDB: a never-set optional field is `isSet: false`, not `null`

Filtering on `field: null` with Prisma's MongoDB adapter does **not** match documents where the
optional field was never written — the field simply is not set (`isSet: false`), so a `null`
equality filter matches zero rows even though the record looks like it has `null` when read back.
This silently broke password reset: `findValidByHash` filtered `usedAt: null`, every reset link was
rejected as "invalid or has expired", and the token row was present, unexpired and unused.

Rule: to query "this optional field has never been set", filter with `field: { isSet: false }`
instead of `field: null`. `isSet: false` also stays correct once the field is written, because a
real value flips it to `isSet: true`. This applies to every optional Prisma field on MongoDB — do
not copy the `field: null` pattern into new adapters.

## Zod schemas on Server Actions must match what the form actually sends

A Server Action whose Zod schema requires a field the form does not post will throw on every
submit and surface as a 500 to the user. The Settings page only posts site fields
(title/description/baseUrl/timezone/logo/favicon), but `saveSettingsAction` also required
`defaultMetaTitle`/`defaultMetaDescription` — which only exist on the SEO form. Saving settings
was broken until those became `.optional()`.

Second trap: turning such fields `.optional()` makes the key present with value `undefined`, and
naive persistence (`String(value)`) writes the literal string `"undefined"` into the DB. The
partial-update use case must `continue` on `undefined` keys.

Rule: keep a Server Action's Zod schema aligned with the form that feeds it — cross-page fields go
into their own action/schema. When a schema makes a key `.optional()`, make sure the persistence
layer treats `undefined` as "do not touch" and add a unit test for the partial update. The default
`"UTC"`-style `.default()` only fires when the key is absent, so it is safe, but it cannot rescue a
field the form never sends in the first place.

## Public read use cases must be explicit, not filters in the app layer

A public site is a composition layer: it must never reach into repositories or re-derive business
rules in `.tsx`. The right seam is explicit **published-only** use cases in the owning module —
`getPublishedPostBySlug`, `listPublishedPosts`, `listPublishedPostsByTag`, etc. — so "only
published content is visible anonymously" is enforced once, in the application layer, and unit
tested against mocked ports. The public-nav resolver also belongs there: it takes menu items and
maps `refId` → public href, dropping references to unpublished/dangling entities, and returning
`[]` for an explicitly requested menu that does not exist (no silent fallback).

Rule: when the admin-facing read already exists (`getPost` by id), do not force the site to filter
post-hoc in the component — add a dedicated published-by-slug read instead. Keep the URL scheme
(`/[slug]` for pages) aligned with the existing `/sitemap.xml` and the menu resolver so one source
of truth drives both navigation and SEO.

## Adding a query filter means touching query type, adapter and tests together

Extending a query (e.g. `ListPostsQuery` gained `tagId`) touches the domain query type, the
infrastructure adapter's `where` clause, and the use case that exercises it. Because MongoDB stores
arrays (`tagIds`), the filter is `{ has: <id> }` guarded by an `isObjectId` check — the same shape
the existing `categoryId` filter already used. Application tests for "posts by tag/category" mock
the reader port, so they verify the query object is passed through with the right `status` +
`tagId`/`categoryId` combination rather than exercising Prisma.

Rule: a filter on a shared query is three coordinated edits (type, adapter, use case + tests). Use
the existing in-memory reader in tests to assert the resulting filter combination instead of
spinning up a database.
