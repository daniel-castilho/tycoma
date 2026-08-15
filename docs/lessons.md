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

`npm test` runs `node --experimental-strip-types --test src/modules/**/*.test.ts`. Node has no
knowledge of the `@/` TypeScript path alias, so any **runtime** import of `@/...` inside a use-case
under test fails with `ERR_MODULE_NOT_FOUND`. (`import type` is stripped by `--experimental-strip-types`,
so only value imports matter.)

Rule: use-case files that are exercised by unit tests must import shared modules with relative
paths and the explicit `.ts` extension (e.g. `../../../../shared/kernel/result.ts`) — following
`auth/application/use-cases/create-first-admin.ts`. Files not under test may keep using `@/`.

## Cross-module ports are wired by a framework composition root

Cross-module access must go through `domain/` ports only — including at composition time. A module
that needs another module's port (e.g. `auth`/`content`/`media` writing audit events) must not
import that module's `application` or `infrastructure`, not even from its own `application/index.ts`.

Rule: each module's `application/index.ts` exposes a wiring factory that receives cross-module
ports as parameters (`createContentApplication(auditEventWriter)`), and the framework wires them
once in `src/app/_lib/modules.ts`, which exports the wired module objects (`content`, `auth`,
`media`, `audit`). Server actions, pages and route handlers import from there. Adding a use-case to
a module only means exporting it from that module's wiring factory; a new cross-module dependency
adds a port parameter to the factory and a wire-up line in `modules.ts`.

## Hierarchical menu items: flatten the tree in the application layer

Storing nested menu items as a flat `MenuItem[]` (each row has `parentId` + `sortOrder`) means the
parent/child links reference ids that are generated at save time. Passing a flat list of client
drafts into `saveMenuItems` cannot produce valid `parentId`s because the ids are brand new.

Rule: accept a nested `MenuItemDraft[]` (children arrays) in the use case and flatten it to the
flat `MenuItem[]` inside the application layer — that is where the parent/child id assignment
belongs, not in the UI. The client editor only manages a tree of drafts; drag-and-drop can be
layered onto it later without touching the use case.