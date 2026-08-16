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

## `npm ci` is strict — the lockfile must include every transitive entry, including optional platform ones

`npm ci` refuses to install when `package.json` and `package-lock.json` are out of sync, even if
the missing pieces are **optional** transitive packages like `@emnapi/runtime` or
`@emnapi/core` (pulled in transitively by `@img/sharp-wasm32` from Next.js 16's image stack).
The error looks like:

```
npm error code EUSAGE
npm error `npm ci` can only install packages when your package.json and package-lock.json
            or npm-shrinkwrap.json are in sync.
npm error Missing: @emnapi/runtime@1.11.3 from lock file
npm error Missing: @emnapi/core@1.11.3 from lock file
```

This surfaced in CI right after the v0.1.0 release: a clean `npm install` on a dev box had
grown the dependency graph (Prisma `ContentType` / `ContentEntry` models + Next.js's wasm32
optionals), but the lockfile committed before `v0.1.0` had only declared those packages as
dependencies of other packages — not as resolved `node_modules` entries. The dev box kept
working because `npm install` quietly filled the gaps; the CI runner, using `npm ci`, did not.
This is also a known npm/cli bug ([#8726](https://github.com/npm/cli/issues/8726), still
open as of late 2025) where `npm install` does not always produce a lockfile that a
subsequent `npm ci` considers in-sync.

Rule: any `npm install` (or `npm install <pkg>`) that **mutates** `package-lock.json` must
commit the updated lockfile in the same change set as the dependency change — otherwise CI
breaks at the next push. If CI fails at `npm ci` with `Missing: <pkg>@<x.y.z> from lock file`,
the fix is to regenerate the lockfile cleanly (`rm -rf node_modules package-lock.json`,
`npm install`) and commit it. `npm ci --ignore-scripts` is a quick local sanity check before
pushing.

## `next build` forces `NODE_ENV=production` even for local builds

When `parseEnv` (or any boot-time validator) tightens rules for `NODE_ENV === "production"`
(e.g. `AUTH_SECRET` length ≥ 32 in production), `next build` on a local dev box — where the
`.env` still has the placeholder secret — crashes with the production error. The runtime
contract is correct (production deployments must use a real secret), but local builds should
not require production-grade secrets.

Rule: when a boot-time env rule must apply only to **runtime** production, detect the Next
build phase via `process.env.NEXT_PHASE === "phase-production-build"` and treat it as
development for the rule's purposes. The rule still bites at `next start` and at any
real deployment where `NODE_ENV === "production"` without the build-phase flag.

## Stored XSS is blocked only as long as the public site stays plain text

Tycoma's public site renders post/page bodies inside `<pre>` / `<p>` (React auto-escapes).
There is **no** `dangerouslySetInnerHTML` anywhere under `src/app/(site)/` today, and a
regression test (`xss-regression.test.ts`) walks that subtree and fails if anyone adds one.
This is the entire stored-XSS defence for Phase A — no sanitizer library is in play.

Rule: if a future feature wants to render CMS body content as HTML, it **must** introduce a
sanitizer library (a new npm dependency, which requires human approval per AGENTS.md rule 5)
and remove the regression test only after that library is wired in and tested. Do **not**
just `dangerouslySetInnerHTML` the body field.

## Phase B shortened the admin session from 7 days to 12 hours

Phase B (`v0.6.0`) reduced the default JWT lifetime and cookie `maxAge` from `7d` to `12h`.
The motivation was to shrink the theft window for a stolen session cookie. Phase B did **not**
add sliding refresh or "remember me" — those are deliberate omissions to keep the cookie
lifetime predictable and to avoid widening the auth surface in this epic.

Consequences worth flagging:

- Any admin logged in before the upgrade will be silently logged out within at most 12 hours
  after the deploy. That is intended.
- Phase B+ should add either sliding refresh (with an absolute cap) or a short-lived access +
  long-lived refresh split. Don't widen the JWT `exp` again as a workaround.
- The 12h number is a **constant** (`SESSION_TTL_SECONDS = 60 * 60 * 12`) — change it in one
  place (`src/app/admin/_lib/session-cookie.ts`) and re-run the suite.

## Step-up re-auth lives in Redis, not in the JWT

Phase B added a step-up flow for `change_password`: the admin re-enters the current password
to receive a `stepup:{userId}` marker in Redis with a 10-minute TTL; the change-password use
case then gates on `StepUpStore.has(userId)`. The marker is **reused** (not consumed) so the
admin can retry the form without re-confirming.

Rule: do **not** add step-up state to the JWT. Cookies travel everywhere; Redis-backed
markers are short-lived, server-side revocable, and require no JWT shape change. Adding TOTP
later will plug into the same `StepUpStore.has` check rather than inventing a second gate.

## 2FA is explicitly deferred — don't sneak it in

Phase B deferred TOTP 2FA (stories B19–B25) because adding a library requires explicit human
approval per AGENTS.md rule 5, and a hand-rolled RFC 6238 implementation adds crypto surface
that is not worth the risk in this sprint. Phase B DoD is valid without 2FA.

Rule: if a future epic proposes 2FA, it **must** come with explicit human approval of a
specific library (`otpauth`, `@otplib/preset-default`, etc.) in the commit message or lessons
note. Do not implement hand-rolled TOTP without a separate decision.

## CSP enforcement is a follow-up, not Phase C scope (v0.7.0)

`Content-Security-Policy-Report-Only` ships in Phase A and is **kept** in Phase C
(`v0.7.0`). Flipping the directive to enforce requires a per-request nonce pipeline
(`'nonce-…'`) for every `<script>` and `<style>` that the App Router injects. Without the
nonce, an enforced policy breaks the admin shell or the public site because Next.js emits
inline style/script tags for runtime bootstrap.

Rule: do **not** flip CSP to enforce-mode in a side change. Track it as its own epic with a
nonce strategy (likely a custom `headers()` wrapper + Server Component inline-script
override). Until then, leave the Report-Only directive in place and document the residual
in the next release notes. When the audit gate (`npm audit --omit=dev --audit-level=high`)
starts reporting a CSP-bypass advisory, the nonce epic becomes blocking.

## SigV4 presigning without the SDK (v0.7.0)

For private-bucket signed URLs we deliberately avoided pulling `@aws-sdk/*` as a direct
dependency. Query-string presigning only needs SHA-256 + HMAC-SHA256 (both in
`node:crypto`), the canonical request from
<https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html>, and the
existing `S3_*` env vars. The implementation validates against LocalStack (which enforces
SigV4) and against real S3; no third-party SDK was needed.

Rule: when a feature needs an SDK helper, check first whether `node:crypto` (or another
already-loaded module) is enough. Adding a direct dep requires explicit human approval per
AGENTS.md rule 5 and also requires committing the regenerated `package-lock.json` per rule
10. SigV4 presign was implemented in 100 lines without a new dep — the default should be
"port to the stdlib" unless the use case is materially larger.

## Advisory allowlist is mechanism-only (v0.7.0)

The CI audit gate (`npm audit --omit=dev --audit-level=high`) ships with an empty allowlist
mechanism: when an advisory must be temporarily accepted, the rule is to record the
advisory id + reason + intended removal date in `docs/lessons.md`, **not** to seed CI with a
pre-baked list of allowed ids. Pre-seeding the allowlist invites drift and obscures the
real risk posture.

Rule: keep `npm audit … --audit-level=high` strict on `main`. If a critical/high advisory
cannot be fixed in-tree in the same change set, open a follow-up issue, document the
advisory id here, and accept that CI will go red until the fix lands.
