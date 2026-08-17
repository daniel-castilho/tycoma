# Session notes — Architecture audit, Phase 7 (close-out)

**Date:** 2026-08-17
**Branch:** `main`
**No git tag** (post-`v0.7.0` follow-up work, tracked under `Unreleased`).

## What landed

**Phase 7 — close-out.** Beyond the doc-sync + gate pass, this phase closed the remaining
Clean Code / SOLID / Twelve-Factor gaps found during the deep verification. The user approved
"fix everything high/medium value".

### Interface segregation (`*Reader` / `*Writer` port pairs)

Repository ports in `auth`, `content` and `media` were split into `*Reader`/`*Writer` pairs;
use cases now depend only on the surface they actually use. The adapters still satisfy the
union, so `src/app/_lib/modules.ts` wiring was unchanged.

- `auth/domain/user.ts` → `UserReader` / `UserWriter`
- `content/domain/types.ts` → `CategoryReader`/`CategoryWriter`, `TagReader`/`TagWriter`
- `content/domain/content-types.ts` → `ContentTypeReader`/`ContentTypeWriter` and
  `ContentEntryReader`/`ContentEntryWriter` (split from the old single repositories)
- `media/domain/types.ts` → `MediaReader` / `MediaWriter`
- Use cases updated across `auth`, `content` and `media`; `public.ts` read use cases narrowed
  to the `*Reader` ports.

### Hexagonal — `node:crypto` behind a port

Password-reset token hashing moved out of the use cases into a new `TokenHasher` port
(`auth/domain/token-hasher.ts`) implemented by `sha256TokenHasher`
(`auth/infrastructure/sha256-token-hasher.ts`). Rate-limit/TTL policy constants
(`CHANGE_PASSWORD_RATE_LIMIT`, `CHANGE_PASSWORD_RATE_WINDOW_SECONDS`, `STEP_UP_TTL_SECONDS`)
live in `auth/domain/policies.ts`.

### Dependency inversion — step-up flows through the composition root

New `getStepUpStatus` use case (`auth/application/use-cases/get-step-up-status.ts`) exposed as
`auth.getStepUpStatus`. `account/page.tsx` and `step-up-hint.tsx` no longer import
`redisStepUpStore` or the use-case-internal `STEP_UP_TTL_SECONDS`.

### Fail loud, not silent

- `deleteMenu` returns `Result` and fails with `"Menu not found."` instead of succeeding
  silently. `deleteMenuAction` handles `!result.ok`; new not-found unit test.
- Argon2 corruption (`Decoding failed`) rethrows instead of being mapped to a failed login;
  `argon2-password-hasher.test.ts` updated to `assert.rejects`.
- `consoleMailer` throws in `NODE_ENV === "production"` (no silent "mail sent").
- Content-type/entry `fields` and menu-item `type` persistence mappers validate their shape and
  throw on unknown values instead of silent `as` casts / `[]`/`{}` fallbacks
  (`parseContentTypeFields`, `parseMenuItemType`).
- `prisma-audit-repository` gained an explicit `mapAuditEvent` (no `as Promise<AuditEvent>`).

### Cleanup

- `object-id` moved from `shared/db` to `shared/kernel` (`git mv`, 8 importers updated).
- `StatusBadge` takes the narrow `ContentStatus` prop (no `string` union / silent fallback).
- Dead code removed: `LOGIN_LOCKOUT_POLICY`, `previewPostAction`/`previewPageAction`, and an
  inert hidden form in the content-entries page.
- UI strings are English-only (AGENTS.md rule 6): fixed Portuguese labels in
  `content-entry-view.tsx` and `content-entry-form.tsx`.

## Gates

```text
npm test                  → 189/189 pass (argon2 test updated to assert.rejects)
npm run lint              → clean
npm run typecheck         → clean
npm run build             → clean
purity grep               → clean (no framework imports in domain/application)
npm audit --omit=dev --audit-level=high → found 0 vulnerabilities
```

## Doc sync (AGENTS.md rule 9)

- `README.md` — Current State bullet: audit is **shipped**, Phase 7 summary added.
- `CHANGELOG.md` — `Unreleased` gains a `Changed` entry for Phase 7.
- `tasks/tycoma-architecture-audit-action-plan.md` — status `Complete`; 7.1/7.2 ticked; gate
  count updated to 189.
- `docs/lessons.md` — argon2 lesson inverted (corruption throws); new "Fail loud" lesson.
- `AGENTS.md` — Port-interfaces convention updated to describe the `*Reader`/`*Writer` pattern;
  Known technical debt unchanged.