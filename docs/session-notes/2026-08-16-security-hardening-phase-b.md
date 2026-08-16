# Session notes — 2026-08-16 (Security Hardening Phase B)

**Session goal:** implement the **Security Hardening Phase B** epic — shorter session TTL,
step-up re-auth for `change_password`, rate-limit expansion, progressive lockout.
**Status at end of session:** shipped. `main` at `95807ba`, CI green, working tree clean.
**No git tag** (per the locked decision — `v0.6.0` is documented in `CHANGELOG.md` /
`README.md` / `docs/releases/v0.6.0.md` and will be cut when the human asks).

---

## What was done in this session

### 0. Cleaned four task Markdown files (mandatory first step)

Same procedure as Phase A — stripped outer fenced blocks, normalized LF, fixed headings:

- `tasks/tycoma-security-hardening-phase-b-backlog.md`
- `tasks/tycoma-security-hardening-phase-b-implementation-sequence.md`
- `tasks/tycoma-security-hardening-phase-b-module-spec.md`
- `tasks/tycoma-ai-software-engineer-prompt-security-hardening-phase-b.md`

### 1. Session TTL `7d` → `12h` (B1, B4, B5)

- `src/modules/auth/infrastructure/jwt-session-issuer.ts` — `setExpirationTime("12h")`.
- `src/app/admin/_lib/session-cookie.ts` — `SESSION_TTL_SECONDS = 60 * 60 * 12`.
- `src/app/admin/_lib/session-cookie.test.ts` — asserts `maxAge === 12h`.

### 2. Rate limit expansion (B11–B14)

- `src/modules/auth/application/use-cases/change-password.ts` — `5 / 15 min` per user id
  (`CHANGE_PASSWORD_RATE_LIMIT` / `CHANGE_PASSWORD_RATE_WINDOW_SECONDS`). Returns a clear
  Result error on excess.
- `src/app/api/media/route.ts` — `30 / 15 min` per `(userId, ip)` via direct Redis key
  (`upload:{userId}:{ip}`). Returns `429` on excess.
- `src/modules/auth/application/use-cases/change-password.test.ts` — 4 cases
  (denied by limiter, missing step-up, happy path, wrong password, budget constants).

### 3. Step-up re-auth (B6–B10) — `change_password` only

- New domain port `StepUpStore` in `src/modules/auth/domain/step-up.ts`.
- New infrastructure adapter `redisStepUpStore` in
  `src/modules/auth/infrastructure/redis-step-up-store.ts` (Redis `stepup:{userId}` with
  TTL via `SET ... EX`).
- New use case `createStepUp` in `src/modules/auth/application/use-cases/step-up.ts`
  (`STEP_UP_TTL_SECONDS = 600`, generic error to avoid account enumeration).
- `changePassword` now gates on `stepUp.has(userId)` (time-boxed reuse, not consumed).
- New `stepUpAction` Server Action in `src/app/admin/_actions/account.ts`.
- `/admin/account` page now shows two stacked forms: "Confirm current password" first,
  then the actual change-password form. Hint text reflects whether the step-up is active.
  Page is now `force-dynamic` so the step-up status reflects the live Redis marker.
- `step-up.test.ts` — 4 cases (grant on match, missing user no-leak, wrong password,
  TTL constant).

### 4. Progressive lockout (B15–B18)

- New domain port `LockoutStore` in `src/modules/auth/domain/lockout.ts`
  (`countFailure` / `isBlocked` / `block` / `reset`).
- New infrastructure adapter `redisLockoutStore` in
  `src/modules/auth/infrastructure/redis-lockout-store.ts` (`lockfail:{key}` counter +
  `lockblock:{key}` flag, both TTL-bounded).
- Policy constants in `src/modules/auth/application/use-cases/lockout-policy.ts`:
  - `LOCKOUT_FAILURE_THRESHOLD = 10`
  - `LOCKOUT_FAILURE_WINDOW_SECONDS = 60 * 60`
  - `LOCKOUT_BLOCK_SECONDS = 60 * 30`
- `login` use case now takes the lockout port and:
  1. Checks `isBlocked` first (cheap O(1) `EXISTS`); rejects immediately if blocked.
  2. Counts failures on unknown-user / wrong-password.
  3. Applies the 30-minute block when the count hits the threshold.
  4. Resets the state on successful login.
- Audit events carry `failures` + `extended_block` flags; `auth.login_blocked` adds a
  `progressive_lockout` reason.
- `login.test.ts` — extended with 4 new cases (threshold trigger, immediate block on
  pre-existing lockout, reset on success, policy constants assertion).

### 5. Deferred items (per locked decisions)

- **TOTP 2FA** (B19–B25) — explicitly deferred. No TOTP library added; no hand-rolled
  RFC 6238 implementation. Phase B DoD is valid without 2FA.
- **Sliding session / refresh** (B2) — deferred.
- **Remember-me** (B3) — deferred.
- **Step-up gating on destructive deletes** (delete post/page/media) — deferred; audit
  already exists.

### 6. Doc sync (AGENTS.md rule 9)

- `tasks/tycoma-security-hardening-phase-b-backlog.md` — every box ticked; deferred items
  explicitly marked.
- `CHANGELOG.md` — `[v0.6.0]` entry with Added / Changed / Deferred / Documentation.
- `README.md` — *Current State* leads with `v0.6.0`; Documentation table gets
  `v0.6.0.md`; Roadmap adds v0.6.0; *Deliberately deferred* now lists Phase C items
  (TOTP 2FA, sliding session, CSP enforce pipeline, private-bucket signed URLs,
  destructive-delete step-up).
- `.env.example` unchanged (Phase B has no new env vars).
- `docs/lessons.md` — three new durable rules:
  - Phase B shortened admin session to `12h` (with consequences spelled out).
  - Step-up re-auth lives in Redis, not in the JWT.
  - 2FA is explicitly deferred — don't sneak it in.
- `AGENTS.md` § *Known technical debt* remains empty (no new violations).

### 7. No new npm dependency

Confirmed: **zero** new packages in this epic.

---

## Final state at end of session

- **Branch:** `main` at `95807ba`
- **Tags on `origin`:** unchanged (no tag cut per locked decision; latest is `v0.5.0`).
- **CI:** green on `95807ba`
- **Working tree:** clean
- **Tests:** 134/134

---

## Pending — to resume in the next session

### Security Hardening Phase C (deliberately deferred, not pending)

- TOTP 2FA with a human-approved library (`otpauth`, `@otplib/preset-default`, etc.)
- Sliding session / refresh redesign
- Full CSP enforce pipeline (flip Report-Only → enforce with nonces)
- Private-bucket signed URLs
- Destructive-delete step-up gating (delete post/page/media in bulk)

### Feature backlog (deliberately deferred)

- MF6 — admin entry-list thumbnail column
- Block-based editor / Markdown on the public site (needs human approval for new dep)
- Public headless API / webhooks / comments / 301 redirects / revision history /
  automated backup / multi-user roles
- Prisma 7 upgrade (blocked upstream)
- Git tag for `v0.6.0` (and any future patch tags) — only when human asks

## Quick resume checklist (next session)

1. `cd /home/castilho/projects/tycoma`
2. `git status` (should be clean), `git log --oneline -5` (should end at `95807ba`).
3. `git tag -l` — latest is still `v0.5.0`; `v0.6.0` is documented but not tagged.
4. Pick the next item from **Pending** above.
5. Re-read `AGENTS.md` § *Critical rules* before touching code.
