# Security Hardening — Phase A — Technical Specification

**Status:** Planning — target design for Phase A only.
**Companion docs:** backlog · implementation-sequence · AI prompt

---

## 1. Purpose

Reduce **stored XSS** and **session-theft / session-riding** risk on a single-tenant CMS that already has competent password hashing and admin route guards.

Phase A does **not** redesign auth. It hardens:

- HTTP response headers
- HTML output (and optionally input)
- Session cookie flags
- Authenticated media upload
- Production `AUTH_SECRET` strength

---

## 2. Architectural placement

| Concern             | Where it lives                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Env / secret policy | `src/shared/env.ts` (+ tests)                                                                                                         |
| Cookie options      | auth infrastructure or small pure helper used by login/logout actions — **not** domain entities                                       |
| JWT issue/verify    | existing `jwt-session-issuer` / verifier — only touch if cookie wiring needs shared constants (e.g. maxAge aligned to `7d`)           |
| Security headers    | `next.config.ts` `headers()` and/or `src/proxy.ts` — composition edge, not modules                                                    |
| HTML sanitize       | pure helper under `src/shared/` or `content` application mapping **before** public render; public `(site)` only consumes safe strings |
| Upload policy       | `media` application use case and/or infrastructure storage adapter; `POST /api/media` remains thin                                    |

**Hard rules (AGENTS.md):**

- No framework imports in `domain/`
- No new npm dependency without human approval
- Cross-module only via ports
- English-only code/docs/commits

---

## 3. Headers (target matrix)

| Header                      | Target                                                        | Notes                                                                                                    |
| --------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `X-Content-Type-Options`    | `nosniff`                                                     | All responses                                                                                            |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`                             | Adjust only if analytics needs documented exception                                                      |
| Frame protection            | `frame-ancestors 'none'` (CSP) and/or `X-Frame-Options: DENY` | Especially admin                                                                                         |
| `Strict-Transport-Security` | `max-age=...; includeSubDomains`                              | **Production + HTTPS only**                                                                              |
| `Content-Security-Policy`   | Start Report-Only if needed                                   | Allow `'self'`; img hosts for S3/public base URL; avoid `unsafe-eval`; document any `unsafe-inline` debt |

Do not invent a second header system later—extend this matrix.

---

## 4. HTML handling

**Threat:** Admin-stored body rendered on public pages executes script in visitor (or admin) browser.

**Policy:**

1. Public render path never emits unsanitized HTML from CMS body fields.
2. Prefer sanitize-on-save so Mongo is not a malware archive.
3. Allowed tags: conservative subset suitable for articles (e.g. `p`, `h1–h3`, `ul/ol/li`, `a`, `strong/em`, `blockquote`, `code`, `pre`, `img` with safe attrs only)—finalize in implementation and tests.
4. Strip event handlers, `javascript:` URLs, `<script>`, `<iframe>`, etc.

If body is plain text today, **escaping on output** may be enough for Phase A; still add tests so a future HTML mode cannot regress.

---

## 5. Session cookie

**Required attributes:**

- `httpOnly: true`
- `secure: true` when `NODE_ENV === 'production'` (or when `APP_URL` is https)
- `sameSite: 'lax'` default (document if `strict`)
- `path: '/'` or tighter if feasible
- `maxAge` consistent with JWT expiry (`7d` unless changed elsewhere—out of scope to shorten in Phase A)

Logout must clear with the same identity attributes so browsers actually drop the cookie.

---

## 6. Media upload policy

| Check      | Rule                                                                                          |
| ---------- | --------------------------------------------------------------------------------------------- |
| Auth       | Existing session required (401 otherwise)                                                     |
| Max size   | Explicit constant (e.g. 5–10 MiB images unless human sets otherwise)                          |
| Type       | Allowlist: `image/jpeg`, `image/png`, `image/webp`, `image/gif` (+ others only with approval) |
| Trust      | Verify magic bytes when feasible; client MIME is insufficient alone                           |
| Key        | UUID/object-id based key under a fixed prefix; never use raw filename as path                 |
| SVG        | **Block** by default in Phase A                                                               |
| Rate limit | Optional reuse of Redis limiter keyed by admin id/ip                                          |

---

## 7. AUTH_SECRET

| Environment      | Rule                                                       |
| ---------------- | ---------------------------------------------------------- |
| development/test | Min length may stay moderate for DX; reject empty          |
| production       | Min length **≥ 32**; reject documented placeholder strings |

Boot must throw via Zod parse failure with a clear message—no silent weak HMAC key.

---

## 8. Testing expectations

- Env schema tests (prod vs dev)
- Cookie options unit tests
- Sanitizer/escape tests with malicious strings
- Media use-case rejects oversize/bad MIME
- Existing auth/public tests still green
- No new test framework

Manual: DevTools cookie flags; View Source / DOM for XSS payload; response headers on `/` and `/admin/login`; upload `.html` / huge file rejected.

---

## 9. Residual risks (accept for Phase A)

- JWT still 7 days (Phase B)
- No 2FA (Phase B)
- CSP may remain Report-Only until Next inline requirements are mapped
- Console mailer in dev (ops concern)

Record residuals in `docs/lessons.md` or AGENTS known debt only if they are standing decisions.

---

## 10. Definition of Done (spec)

Matches epic backlog DoD: headers, sanitization, cookies, uploads, secret policy, tests, docs.
