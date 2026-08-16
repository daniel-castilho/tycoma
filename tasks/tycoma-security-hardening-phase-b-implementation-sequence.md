# Security Hardening — Phase B — Implementation Sequence

**Companion docs:** module-spec · backlog · AI prompt

**Document status:** Planning.

---

## Guiding principles

1. Build on Phase A cookie attributes; never remove `httpOnly` / `secure` (prod) / `sameSite`.
2. Prefer Redis for rate limit, lockout, and step-up markers (already in stack).
3. TOTP library = **stop for human approval** before `npm install`.
4. Hexagonal: new ports (`TotpVerifier`, extended `RateLimiter`) in `auth` domain; adapters in infrastructure.
5. Doc sync is part of Done.

---

## Delivery order

### Step 1 — Session TTL (B1, B4, B5)

1. Introduce named constants for access TTL (e.g. `SESSION_TTL = '12h'`).
2. Align `SignJWT.setExpirationTime` + cookie `maxAge`.
3. Tests for exp; smoke login and observe cookie expiry.

**Exit:** New sessions die within the short window.

---

### Step 2 — Rate limit expansion (B11–B14)

1. Wrap `POST /api/media` with limiter (user id if session present, else IP).
2. Ensure password-change / other sensitive actions share limiter helpers.
3. Mocked unit tests.

**Exit:** Burst upload/login-adjacent abuse gets 429/Result error.

---

### Step 3 — Step-up re-auth (B6–B10)

1. Define `SensitiveAction` list in auth application (start with `change_password`).
2. Redis (or signed short JWT claim) `stepUp:${userId}` TTL 5–15 min after password confirm.
3. Gate change-password use case on active step-up.
4. Admin UI: prompt current password when needed.
5. Tests.

**Exit:** Change password without recent re-auth fails.

---

### Step 4 — Sliding / remember-me (B2–B3) — optional after Step 1

1. Default short TTL remains.
2. Remember-me lengthens absolute exp only when checked.
3. Sliding refresh on admin proxy or layout load — carefully, with absolute cap.
4. Tests for both modes.

**Exit:** Default still short; remember-me documented and tested.

---

### Step 5 — Progressive lockout (B15–B18)

1. Track failed attempts in Redis.
2. Stepped cooldown after thresholds.
3. Audit + tests.

**Exit:** Repeated failures slow down more than a flat window.

---

### Step 6 — TOTP 2FA (B19–B25) — only with human-approved dependency

1. Get approval + add library.
2. Ports + encrypt/store secret pattern (document key from env).
3. Setup / login challenge / recovery codes.
4. Integrate with step-up when 2FA on.
5. Tests with deterministic TOTP port fake.

If approval denied: mark B19–B25 deferred; Phase B can still DoD without 2FA.

---

### Step 7 — Verify & docs (B26–B28)

Gates + smoke + README/CHANGELOG/tasks/lessons.

---

## Definition of Done (sequence)

- [ ] Step 1 Session TTL
- [ ] Step 2 Rate limit expansion
- [ ] Step 3 Step-up re-auth
- [ ] Step 4 Sliding/remember-me (or explicit skip)
- [ ] Step 5 Progressive lockout (or explicit skip)
- [ ] Step 6 2FA shipped or deferred
- [ ] Step 7 Docs + gates

**Target milestone:** `v0.4.0` (or next security-labeled release after Phase A).

---

_Do not start 2FA coding until dependency approval is recorded (commit message or lessons note)._
