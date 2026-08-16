# Security Hardening — Phase B — Technical Specification

**Status:** Planning
**Companions:** backlog · sequence · AI prompt

---

## 1. Purpose

Limit damage from **stolen session cookies**, **brute-force**, and **abusive authenticated uploads**, and optionally require **TOTP** for the sole admin.

---

## 2. Placement

| Concern               | Location                                                              |
| --------------------- | --------------------------------------------------------------------- |
| Session TTL constants | auth domain or auth infrastructure issuer + cookie factory            |
| JWT issue/verify      | existing jose issuer/verifier                                         |
| Step-up marker        | Redis adapter behind a domain port (`StepUpStore`)                    |
| Rate limit            | existing Redis rate limiter port; new keys/namespaces                 |
| Lockout               | Redis counters/TTLs behind limiter or `LockoutStore` port             |
| TOTP                  | `auth` domain ports + infrastructure adapter; secrets never in `app/` |
| UI prompts            | `src/app/admin/**` composition only                                   |

---

## 3. Session model (target)

| Mode        | Access token lifetime      | Absolute cap        | Cookie                         |
| ----------- | -------------------------- | ------------------- | ------------------------------ |
| Default     | 8–24h (choose one)         | = access            | maxAge matches exp             |
| Remember me | longer (e.g. 7–30d)        | required            | same security flags as Phase A |
| Sliding     | refresh access on activity | hard cap from login | re-set cookie                  |

Verify path (`proxy` / edge verifier) must reject expired JWT. No change to HS256 without a separate decision.

---

## 4. Step-up re-auth

**Sensitive actions (minimum):**

1. `change_password`
2. (Recommended) disable/enable 2FA
3. (Optional) destructive bulk deletes

**Flow:**

1. User submits current password (and TOTP if enabled) to a `createStepUp` use case.
2. On success, store `stepUp:${userId}` in Redis with TTL, or issue a short-lived step-up token bound to user id.
3. Sensitive use cases require valid step-up.
4. Consuming step-up on one-shot actions is optional; time-boxed reuse is OK for UX.

Never log passwords or TOTP codes.

---

## 5. Rate limiting

| Endpoint / action      | Key suggestion | Budget (starting point; tune) |
| ---------------------- | -------------- | ----------------------------- |
| Login                  | email + IP     | existing                      |
| Password reset request | email + IP     | existing                      |
| Media upload           | userId + IP    | e.g. 30 / 15 min              |
| Change password        | userId         | e.g. 5 / 15 min               |

Return safe errors; audit repeated blocks if useful.

---

## 6. Progressive lockout

Example policy (implement concretely in code):

- 5 failures / 15 min → already limited
- 10 failures / 1 h → extended block 30–60 min
- Counters in Redis with TTL
- Unlock: wait or password-reset path

Single-admin recovery must not depend on a second admin user.

---

## 7. TOTP 2FA

**Only after human approves a library.**

| Item           | Rule                                                |
| -------------- | --------------------------------------------------- |
| Secret at rest | Encrypted or equivalent protection; env-derived key |
| Setup          | QR/otpauth URI once; confirm code before enable     |
| Login          | Password OK → TOTP challenge → session              |
| Recovery codes | Generated once, stored hashed, single use           |
| Disable        | Requires step-up                                    |

Domain remains free of Next/Redis imports; adapters implement crypto and Redis.

---

## 8. Testing

- TTL/exp unit tests
- Step-up grant/reject/expiry
- Limiter mocked denials
- Lockout threshold behaviour
- TOTP with **fake clock / fake verifier port** (no flaky wall-clock tests)
- Existing login/setup/reset suites still green

---

## 9. Residual risks after Phase B

- No passkeys
- JWT still bearer-in-cookie (theft window = TTL)
- No device binding
- Captcha not in scope

---

## 10. Definition of Done

Matches backlog DoD; Phase A cookie flags preserved.
