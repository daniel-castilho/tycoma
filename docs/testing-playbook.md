# Testing Playbook

**Role:** Write and interpret tests for this Next.js 16 hexagonal modular monolith (Prisma 6 + MongoDB, Redis, LocalStack S3).
**Stack constraints:** Node.js built-in test runner (`node --test` + `--experimental-strip-types`) only — no Jest, Vitest, Playwright, or other test deps without human approval.

Sources: `AGENTS.md` · `docs/lessons.md` · `docs/coding-standards.md` · colocated `*.test.ts` · epic docs under `tasks/`

---

## Pyramid

1. **Domain unit** — pure invariants and parsers (`parseContentStatus`, slug rules, ObjectId helpers). **No mocks.**
2. **Application unit** — use-case factories with **mocked domain ports only**; happy path + rejection + audit side effects.
3. **Infrastructure unit (selective)** — pure adapter behaviour that is deterministic without Docker (e.g. Argon2id hash/verify, malformed-hash soft-fail). Prefer ports in application tests over spinning real Redis/S3/Mongo.
4. **Composition / edge** — thin pure helpers (`isPublicAdminPath`, `isAdminPath`). Not React component trees.
5. **Smoke** — `docker:up` + `npm run dev` (or production build) against real Mongo/Redis/LocalStack; exercise admin write → public read.

This is **not** a public JSON API project and **not** a Faces app. Exercise **ports / use cases**. Next.js pages, Server Actions and Route Handlers are composition only — keep business assertions in application tests. Never adapter → adapter across modules; never import another module’s `infrastructure/` from tests or production code.

---

## Runner & layout

```bash
npm test
# → node --import ./scripts/test-register.mjs --experimental-strip-types --test src/**/*.test.ts
```

- `@/` path alias is resolved at runtime by `scripts/test-resolver.mjs` (see `docs/lessons.md`). Keep imports alias-first; do not rewrite tests to relative paths “to make Node happy.”
- Colocate tests next to the code under test: `create-login.ts` → `login.test.ts`, `content-status.ts` → `content-status.test.ts`.
- English names: `rejects_when_user_already_exists`, or descriptive `it("returns null for a draft post")`.
- Assert with `node:assert` / `node:assert/strict` and `node:test` (`describe`, `it`).

**Factories under test**

```ts
const login = createLogin(repo, issuer, limiter, audit, hasher)
const result = await login({ email, password, ip })
assert.equal(result.ok, true)
```

Prefer in-memory fakes (`memoryUsers`, `memoryPostRepo`, `noopAudit`) over heavy mocks. Mirror existing suites in `auth`, `content`, `media`, `audit`.

---

## Mandatory patterns

| Pattern               | Rule                                                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Domain tests          | No mocks; pure functions / value objects only                                                                                                    |
| Application tests     | Mock **ports** only (repos, hasher, issuer, limiter, storage, audit writer)                                                                      |
| Result shape          | Prefer `Result<T, E>` (`ok` / `err` from `@/shared/kernel/result`) or the use case’s established `{ ok, value?, error? }` — assert both branches |
| Published-only        | Public reads must never return `draft` / non-published; assert `null` or empty list                                                              |
| Audit                 | Meaningful mutations record events; assert `eventType` (and actor when relevant)                                                                 |
| Passwords             | Always via `PasswordHasher` port; never assert plaintext at rest                                                                                 |
| Reset tokens          | Stored **hashed**; unknown email must not leak existence (no mail / no token)                                                                    |
| Rate limit            | Blocked limiter → rejected login / reset request                                                                                                 |
| Guards                | Duplicate slug, category cycle, page-with-children delete, media-in-use delete                                                                   |
| Zod / partial updates | Optional fields mean “do not touch”; never write the string `"undefined"`                                                                        |
| Prisma 6 + Mongo      | Stay on 6.x; optional unset fields use `isSet: false` filters in adapters (lesson) — application tests still mock ports                          |
| Boundary grep         | `domain/` and `application/` remain free of `next/`, `@prisma`, `ioredis`, `jose`, `react`                                                       |

---

## Current automated suite (map)

| Area             | File(s)                                              | Focus                                                      |
| ---------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| Auth setup       | `auth/.../create-first-admin.test.ts`                | First admin; lockout when user exists; short password      |
| Auth login       | `auth/.../login.test.ts`                             | Success, bad password, rate limit, audit                   |
| Auth reset       | `auth/.../password-reset.test.ts`                    | Request/reset; enumeration-safe; rate limit; expired token |
| Argon2 adapter   | `auth/infrastructure/argon2-password-hasher.test.ts` | `$argon2id$`; verify; malformed → false                    |
| Content status   | `content/domain/content-status.test.ts`              | Parse known; throw on unknown                              |
| Content guards   | `content/.../content-guards.test.ts`                 | Slug unique; category cycle; page children; publish        |
| Public reads     | `content/.../public.test.ts`                         | Published filters; breadcrumb; nav hrefs skip unpublished  |
| Menus / settings | `content/.../menus.test.ts`, `settings.test.ts`      | Nested drafts flatten; partial settings                    |
| Media            | `media/.../media.test.ts`                            | Upload; empty file; delete usage guard; audit              |
| Audit            | `audit/.../audit.test.ts`                            | Record; list filters; bad dates ignored                    |
| Shared           | `shared/db/object-id.test.ts`                        | ObjectId helper                                            |
| Admin paths      | `app/admin/_lib/auth-routes.test.ts`                 | Public vs protected admin paths                            |

When you change behaviour covered above, **extend the existing file** instead of inventing a parallel suite.

---

## Regression checklist

| Area                          | Must verify                                                                                                                                                 |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth — setup**              | Only while zero users; second setup rejected; password hashed via port                                                                                      |
| **Auth — login**              | Valid credentials issue session token; wrong password fails; rate limit blocks; audit on success/failure as designed                                        |
| **Auth — recovery**           | Existing email creates hashed token + mail; unknown email succeeds with **no** side channel; reset consumes token; short password rejected                  |
| **Auth — routes**             | `/admin/setup`, `/login`, `/forgot-password`, `/reset-password` public; `/admin/dashboard`, posts, etc. not public (`auth-routes.test.ts` + `src/proxy.ts`) |
| **Content — posts/pages**     | Duplicate slug rejected; publish sets `publishedAt`; draft never returned by public use cases                                                               |
| **Content — taxonomy**        | Category parent cycle rejected; self-parent rejected; delete category blocked when posts reference it                                                       |
| **Content — pages hierarchy** | Delete blocked when children exist; breadcrumb skips unpublished ancestors; no infinite parent loop                                                         |
| **Content — menus**           | Nested `MenuItemDraft[]` flattened in application layer; public nav skips items whose ref is unpublished                                                    |
| **Content — settings / SEO**  | Partial update does not clobber omitted fields                                                                                                              |
| **Media**                     | Empty upload rejected; delete refused when `findUsages` non-empty; storage + repo deleted only when free; audit `media.uploaded` / `media.deleted`          |
| **Audit**                     | Writer reachable from auth/content/media factories; list filters by type/date/search without throwing on bad dates                                          |
| **Public site**               | Home/list/detail only **published**; unknown/draft slug → not found; menu + settings drive shell; media URLs resolve                                        |
| **Boundaries**                | No cross-module `infrastructure` imports; composition only via `src/app/_lib/modules.ts`                                                                    |
| **Stack**                     | Prisma **6.x** only; no new test framework deps                                                                                                             |

**Public read regression (application):** seed draft + published post/page → `listPublished*` / `getPublished*BySlug` return only published → nav builder omits unpublished refs → breadcrumb empty for unpublished page.

**Media delete regression:** upload → reference from post (usage) → `deleteMedia` fails → clear usage → delete succeeds and storage key gone (in-memory fake).

---

## Release regression smoke (browser)

Run against **local stack** before a release tag:

```bash
npm run docker:up          # Mongo replica set + Redis + LocalStack S3
npm run prisma:generate
npm run prisma:push        # dev only
npm run build              # optional but preferred before tag
npm run dev                # or npm run start after build
```

**Required — stop and fix on first failure.**

| #   | Step                                                                            | Expected                                             |
| --- | ------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 1   | Open `/admin/setup` (empty DB)                                                  | Create first admin; subsequent setup locked          |
| 2   | `/admin/login`                                                                  | Session; land in admin shell                         |
| 3   | Create category + tag                                                           | Listed; cycle/self-parent rejected if attempted      |
| 4   | Create **draft** post + **published** post (with slug, optional featured image) | Both in admin list                                   |
| 5   | Create published page (optional child page)                                     | Admin list + hierarchy                               |
| 6   | Upload media; attach/use on post if UI allows                                   | Grid shows file; public URL reachable                |
| 7   | Settings + primary menu (post/page/category/custom links)                       | Saved                                                |
| 8   | `/` public home                                                                 | **Only** published posts; draft absent               |
| 9   | `/posts/[slug]` published                                                       | 200 + metadata; draft slug → 404                     |
| 10  | `/[slug]` published page                                                        | 200; unpublished → 404                               |
| 11  | Category/tag public pages                                                       | Only published posts                                 |
| 12  | Menu links                                                                      | Resolve; unpublished targets not exposed             |
| 13  | `/sitemap.xml`                                                                  | Responds; includes published posts/pages as designed |
| 14  | `/admin/audit-log`                                                              | Recent create/publish/upload events visible          |
| 15  | Logout; hit `/admin/dashboard`                                                  | Redirect to login                                    |
| 16  | Password reset happy path (console mailer)                                      | Token flow works; login with new password            |

**Optional (do not block tag):** change-password on account page; media delete blocked while in use; SEO defaults reflected in `generateMetadata`.

---

## Quality gates (CI local mirror)

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

CI (`.github/workflows/ci.yml`) runs the same four. Prefer green unit tests without Docker; smoke uses `docker:up`.

---

## Reading failures

| Class            | Signal                                 | First move                                                          |
| ---------------- | -------------------------------------- | ------------------------------------------------------------------- |
| **Logic**        | `AssertionError`, wrong `ok` / filter  | Fix use case or wrong expectation                                   |
| **Boundary**     | Forbidden import in domain/application | Restore port boundary — do not weaken                               |
| **Resolver**     | `ERR_MODULE_NOT_FOUND` for `@/`        | Confirm `test-register.mjs` / alias; keep `@/` imports              |
| **Prisma / env** | Client missing, `P1012`, env Zod fail  | `prisma generate`; check `src/shared/env.ts`; Prisma **6.x** only   |
| **Auth crypto**  | Argon2 enum / verify throw             | Numeric algorithm/version literals; malformed hash → false (lesson) |
| **Flaky / env**  | Docker, port, LocalStack               | Re-run; fix compose — don’t skip tests                              |
| **Compose**      | Missing export from `modules.ts`       | Wire factory params; don’t import infrastructure from `app/`        |

**Priority when many fail:** typecheck/lint → shared kernel → touched module application tests → auth guards → public read filters → unrelated modules.

---

## Analyzer reply format

```text
## Summary
Module / test / class (Logic|Boundary|Resolver|Prisma|AuthCrypto|Flaky|Compose)
Cause (one line)

## Fix plan
1. …
2. …

## Verify
npm test
# optionally: npm run typecheck && npm run build
# smoke: npm run docker:up && npm run dev
```

---

## Do not

- Skip, delete, or `@skip` tests to green the build
- Add Jest/Vitest/Playwright/Testing Library without human approval
- Call another module’s `infrastructure/` from tests or production code
- Assert on draft content in public use cases
- Log or assert plaintext passwords or raw reset tokens
- Bump Prisma to 7 (no MongoDB support — `docs/lessons.md`)
- Put business rules in `src/app/**` tests “because the page failed”
- Broaden security by making extra `/admin/**` paths public without updating `auth-routes` tests

---

## Done when

- [ ] Happy path + at least one rejection automated for the change
- [ ] New domain/application behaviour has a colocated `*.test.ts`
- [ ] Public visibility rules covered when content/media surface changes
- [ ] Failure analysis names root cause and smallest fix
- [ ] `npm test` (+ lint/typecheck/build as appropriate) green
- [ ] Browser smoke steps clear when UI or public routes are involved
- [ ] Docs synced if milestone-sized (README Current State / CHANGELOG / tasks) per `AGENTS.md`

```

```
