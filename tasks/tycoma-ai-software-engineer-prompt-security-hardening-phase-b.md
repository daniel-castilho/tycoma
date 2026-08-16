# AI Software Engineer Prompt — Security Hardening Phase B

**Status:** Ready after Phase A is on `main` (or equivalent).

---

## Context

Tycoma: single-tenant hexagonal CMS (Next.js 16, Prisma 6 + MongoDB, Redis, jose, Argon2id, Zod).
Phase A delivered headers, cookie flags, upload hardening, strong `AUTH_SECRET` policy.
Phase B: **session lifetime, step-up re-auth, rate-limit expansion, progressive lockout, optional TOTP 2FA**.

**Read first:**

1. `AGENTS.md`
2. `docs/testing-playbook.md` (if present)
3. `docs/coding-standards.md` · `docs/lessons.md`
4. `tasks/tycoma-security-hardening-phase-b-module-spec.md`
5. `tasks/tycoma-security-hardening-phase-b-backlog.md`
6. `tasks/tycoma-security-hardening-phase-b-implementation-sequence.md`
7. Auth issuer/verifier, cookie factory, Redis limiter, `src/proxy.ts`, login/change-password actions, `POST /api/media`

---

## Goal

Implement Phase B per sequence. Preserve Phase A cookie security attributes.

## Non-negotiable

1. No new npm dependency without **explicit human approval** (especially TOTP libraries).
2. No Prisma 7.
3. Domain/application stay free of Next/Prisma/ioredis/jose imports (ports only).
4. Do not push unless human asks.
5. English commits/docs; doc sync on Done.
6. Do not weaken rate limits on login/reset already present.

---

## Locked decisions

1. **Default session TTL:** short (**12h** unless code already standardized—pick one constant and document). Align JWT exp + cookie maxAge.
2. **Remember-me:** optional; only if UI cost is low; default remains short.
3. **Step-up:** mandatory for **change password**; use Redis TTL marker or equivalent port.
4. **Media upload:** rate limited.
5. **SVG/upload allowlists:** do not reopen Phase A decisions.
6. **2FA:** implement only after human says which library (or “skip 2FA this epic”).

---

## Order

1. Session TTL constants + tests
2. Rate limit `/api/media` + sensitive actions
3. Step-up re-auth for change-password
4. Remember-me / sliding if time permits
5. Progressive lockout
6. 2FA only with approval
7. Gates + smoke + docs

---

## Stop and ask if

- You need a new dependency
- Step-up design would require storing password hashes in Redis
- Sliding refresh conflicts with edge proxy constraints
- Any change implies multi-user RBAC

---

## Done report

```markdown
# Phase B report

## Session TTL

## Rate limits

## Step-up

## Lockout

## 2FA (shipped / deferred + reason)

## Tests & gates

## Docs

## Residuals
