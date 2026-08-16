# Security Hardening — Phase B — Backlog

**Companion documents:**
`tycoma-security-hardening-phase-b-module-spec.md` · `tycoma-security-hardening-phase-b-implementation-sequence.md` · `tycoma-ai-software-engineer-prompt-security-hardening-phase-b.md`

**Document status:** Planning — living; mark stories as they land.

**Epic goal:** Reduce **session abuse** and **online attack surface** after Phase A (headers, cookies, upload, secrets). Focus: **shorter session lifetime**, **sensitive-action re-auth**, **broader rate limiting**, **progressive lockout**, and **optional TOTP 2FA** for the single admin.

**Prerequisite:** Phase A complete (or equivalent on `main`): secure cookie flags, production `AUTH_SECRET` policy, upload hardening, security headers. Auth still: Argon2id, jose JWT, Redis rate limit on login/reset, `/admin` proxy guard.

**Out of scope for Phase B:** Full server-side session store rewrite (unless minimal and justified), WebAuthn/passkeys, multi-admin RBAC, WAF, private-bucket signed URLs, Phase C ops (Dependabot program, security.txt process as a product epic).

---

## Scope Summary

| Lane                          | Priority               | Status  | Notes                                                             |
| ----------------------------- | ---------------------- | ------- | ----------------------------------------------------------------- |
| Session TTL & sliding refresh | Essential              | Planned | Shorter access lifetime; optional remember-me                     |
| Sensitive-action re-auth      | Essential              | Planned | Password (or 2FA) again for change-password / high-impact actions |
| Rate limit expansion          | Essential              | Planned | `/api/media` + sensitive Server Actions                           |
| Progressive lockout           | Soon-after             | Planned | Beyond fixed window limiter                                       |
| TOTP 2FA                      | Essential (excellence) | Planned | Single-admin; **new dep needs human approval**                    |
| Tests + smoke + docs          | Essential              | Planned |                                                                   |

---

## Planned Stories

### A. Session lifetime

- [x] **B1** — Default JWT/session lifetime shortened from `7d` to `12h`. JWT `exp` and cookie `maxAge` aligned (`SESSION_TTL_SECONDS = 60 * 60 * 12`).
- [ ] **B2** — Sliding session: **deferred** (Phase B+ follow-up). Documented in `docs/releases/v0.6.0.md` and lessons.
- [ ] **B3** — Remember-me: **deferred** (Phase B+ follow-up). Default short TTL only.
- [x] **B4** — Logout remains hard clear of cookie; JWT verify enforces `exp` (no signature changes).
- [x] **B5** — Unit tests for cookie maxAge alignment (`session-cookie.test.ts` updated; lockout/TTL behaviour covered by login suite).

### B. Sensitive-action step-up (re-auth)

- [x] **B6** — Sensitive actions list documented: only `change_password` in Phase B (delete post/page/media deferred).
- [x] **B7** — Step-up requires recent successful password verification before `changePassword` proceeds.
- [x] **B8** — Redis-backed `stepup:{userId}` marker with TTL 10 minutes; `StepUpStore` port + `redisStepUpStore` adapter.
- [x] **B9** — Admin UI: `/admin/account` now shows a "Confirm current password" form before the change-password form; hint text reflects the active window.
- [x] **B10** — Tests: change-password rejected without step-up; accepted with valid step-up; step-up TTL constant asserted.

### C. Rate limiting expansion

- [x] **B11** — `POST /api/media` rate-limited: 30 / 15 min per `(userId, ip)` via direct Redis key (`upload:{userId}:{ip}`); returns `429` on excess.
- [x] **B12** — `change_password` rate-limited: 5 / 15 min per user id (`CHANGE_PASSWORD_RATE_LIMIT` / `CHANGE_PASSWORD_RATE_WINDOW_SECONDS`); returns a clear Result error.
- [x] **B13** — Consistent error shape: API route returns `{ error }` JSON with status code; use cases return `Result.err`.
- [x] **B14** — Unit tests with mocked limiter: change-password rejects on limiter denial.

### D. Progressive lockout / backoff

- [x] **B15** — After 10 failures within 1 hour (per `(ip, email)`), apply an extended 30-minute block (`LOCKOUT_FAILURE_THRESHOLD` / `LOCKOUT_BLOCK_SECONDS`).
- [x] **B16** — `LockoutStore` port + `redisLockoutStore` adapter; counters and blocks both TTL-bounded in Redis; unlock by expiry (single-admin recovery via password reset path unchanged).
- [x] **B17** — Audit events: `auth.login_failed` carries `failures` and `extended_block` flags; `auth.login_blocked` includes `progressive_lockout` reason.
- [x] **B18** — Tests for stepped block behaviour: threshold trigger, immediate block on pre-existing lockout, reset on success.

### E. TOTP 2FA (single admin)

- [ ] **B19** — **Deferred.** No TOTP library added in Phase B; deferred to a follow-up epic pending human approval of a dependency.
- [ ] **B20–B25** — **Deferred.** All 2FA stories depend on B19; Phase B DoD is valid without 2FA.

### F. Verification & docs

- [x] **B26** — `npm test` (134/134), `lint`, `typecheck`, `build` green.
- [x] **B27** — Manual smoke checklist documented in `docs/releases/v0.6.0.md` (cookie `maxAge`; upload 429; change-password without step-up rejected; lockout block path).
- [x] **B28** — Doc sync: README Current State, CHANGELOG, this backlog, lessons.

---

## Explicitly out of scope

- Passkeys / WebAuthn (Phase C+)
- Multi-user roles
- Full Redis session store replacing JWT
- IP allowlist / geo blocking
- Captcha providers
- Phase A rework (headers/CSP/upload allowlist)

---

## Definition of Done (epic)

- [x] Default session lifetime is short (`12h`); cookie `maxAge` matches JWT
- [x] At least `change_password` requires step-up re-auth (Redis-backed, 10 min reuse)
- [x] Media upload and change-password are rate-limited; login still uses the existing limiter
- [x] Progressive lockout (10 failures / 1h → 30 min block) implemented and audited
- [x] 2FA explicitly deferred pending dependency approval
- [x] Tests + gates green; smoke done; docs synced

---

_Phase B assumes Phase A cookie/header baselines. Do not weaken HttpOnly/Secure/SameSite._
