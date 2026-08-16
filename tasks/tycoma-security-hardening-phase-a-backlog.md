# Security Hardening — Phase A — Backlog

**Companion documents:**
`tycoma-security-hardening-phase-a-module-spec.md` · `tycoma-security-hardening-phase-a-implementation-sequence.md` · `tycoma-ai-software-engineer-prompt-security-hardening-phase-a.md`

**Document status:** Planning — living; mark stories as they land.

**Epic goal:** Raise Tycoma from “solid single-admin auth” to **day-one resistance against stored XSS and trivial session abuse**, without multi-user, 2FA, or a full security program. Focus: **HTTP security headers, HTML sanitization, session-cookie policy, media upload hardening, production secret policy**.

**Prerequisite:** `v0.2.0` (Admin Dashboard + Public Site MVP) on `main`. Auth already uses Argon2id, jose JWT, Redis rate limits, Zod, `/admin` proxy guard.

**Out of scope for Phase A:** TOTP/2FA, short session + refresh redesign, WAF, dependency-audit CI gate as a full program, private-bucket signed URLs redesign, security.txt process, Phase B/C items from the security roadmap.

---

## Scope Summary

| Lane                      | Priority  | Status  | Notes                                                                                      |
| ------------------------- | --------- | ------- | ------------------------------------------------------------------------------------------ |
| Security response headers | Essential | Planned | CSP (report-only → enforce if safe), HSTS (prod/HTTPS), nosniff, referrer, frame-ancestors |
| HTML sanitization         | Essential | Planned | Public render; prefer sanitize-on-save too                                                 |
| Session cookie attributes | Essential | Planned | HttpOnly, Secure (prod), SameSite, Path; document/test                                     |
| Media upload hardening    | Essential | Planned | Size limit, MIME/magic allowlist, safe keys; block or sanitize SVG                         |
| AUTH_SECRET policy        | Essential | Planned | Stronger minimum in production; reject known defaults                                      |
| Tests + smoke             | Essential | Planned | Extend unit tests + browser/header checks                                                  |
| Docs sync                 | Essential | Planned | README / CHANGELOG / lessons / AGENTS as needed                                            |

---

## Planned Stories

### A. Security headers

- [x] **H1** — Central place to apply security headers on responses (`next.config.ts` `headers()`).
- [x] **H2** — `X-Content-Type-Options: nosniff` on all responses.
- [x] **H3** — `Referrer-Policy: strict-origin-when-cross-origin`.
- [x] **H4** — `Content-Security-Policy: frame-ancestors 'none'` + `X-Frame-Options: DENY`.
- [x] **H5** — `Strict-Transport-Security` gated on production + HTTPS only.
- [x] **H6** — `Content-Security-Policy-Report-Only` baseline (default-src 'self', img-src allowing existing S3 host, no unsafe-eval; unsafe-inline kept for Next).
- [x] **H7** — Header matrix documented in `docs/releases/v0.5.0.md`.

### B. HTML sanitization (XSS)

- [x] **S1** — Decision: no new dependency. Public body is already rendered as plain text inside `<pre>` / `<p>` (React escapes); the regression guard in `src/app/(site)/_components/xss-regression.test.ts` prevents future introduction of `dangerouslySetInnerHTML` without an explicit sanitization decision.
- [x] **S2** — Public render paths confirmed safe (no `dangerouslySetInnerHTML` anywhere under `src/app/(site)/`).
- [x] **S3** — Sanitize-on-save: **out of Phase A scope** (would require a sanitizer library).
- [x] **S4** — Unit test: `xss-regression.test.ts` walks the public site tree and asserts no `dangerouslySetInnerHTML` references.
- [x] **S5** — Admin preview policy: admin preview still renders the same plain-text component (`<pre>` / `<p>`); documented in `docs/releases/v0.5.0.md` and in the regression test docstring.

### C. Session cookie policy

- [x] **C1** — Single source of truth at `src/app/admin/_lib/session-cookie.ts` (`SESSION_COOKIE_OPTIONS`). Used by both `setSessionCookie` and `clearSessionCookie` in `src/app/admin/_actions/auth.ts`.
- [x] **C2** — Attributes: `httpOnly: true`, `secure` in production, `sameSite: 'lax'`, `path: '/'`, `maxAge` aligned with JWT 7-day expiry.
- [x] **C3** — Logout clears with matching attributes by re-using `SESSION_COOKIE_OPTIONS` with `maxAge: 0`.
- [x] **C4** — `src/app/admin/_lib/session-cookie.test.ts` asserts the option shape so it cannot regress silently.
- [x] **C5** — JWT 7-day lifetime unchanged in this epic; recorded as a Phase B residual in `docs/lessons.md`.

### D. Media upload hardening

- [x] **U1** — `MAX_UPLOAD_BYTES = 10 MiB` enforced server-side in `createUploadMedia`; oversize returns an error result.
- [x] **U2** — `ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]`; everything else rejected (PDF/video/audio removed for Phase A; can be re-added with explicit human approval).
- [x] **U3** — `sniffMimeType` reads magic bytes (JPEG SOI, PNG signature, GIF87a/89a, RIFF/WEBP); the declared MIME must match what the bytes actually contain.
- [x] **U4** — Storage keys are `media/${newObjectId()}.${ext}` — server-generated, no user-controlled path segments.
- [x] **U5** — SVG blocked by default: `image/svg+xml` MIME or `.svg` extension both rejected; `next.config.ts` `images.dangerouslyAllowSVG` is now `false`.
- [x] **U6** — Session auth already required on `POST /api/media`; rate limit deferred (existing Redis limiter patterns unchanged — out of scope here).
- [x] **U7** — Application tests cover: valid PNG upload, jpeg/gif/webp accepted, empty file, oversize, SVG, MIME-mismatch, unknown magic bytes.

### E. Production secret policy

- [x] **P1** — `parseEnv` in `src/shared/env.ts` requires `AUTH_SECRET` length ≥ 32 in production; fails fast at boot with a clear Zod-derived message.
- [x] **P2** — `FORBIDDEN_AUTH_SECRETS` allowlist rejects the `.env.example` placeholder string.
- [x] **P3** — `NODE_ENV=development` / `test` keeps the 16-char minimum for DX; `.env.example` updated to flag the production bar in comments. The strict rule is bypassed during `next build` via `NEXT_PHASE === "phase-production-build"` so local builds with the placeholder secret still work.
- [x] **P4** — `src/shared/env.test.ts` covers dev/branch lengths, empty, placeholder rejection, whitespace, missing DATABASE_URL.

### F. Verification & docs

- [x] **V1** — `npm test` (121/121), `lint`, `typecheck`, `build` all green.
- [x] **V2** — Manual smoke checklist documented in `docs/releases/v0.5.0.md` (cookie flags, XSS payload, upload rejection, response headers).
- [x] **V3** — Doc sync per AGENTS.md (this backlog, README Current State, CHANGELOG, `docs/lessons.md`).

---

## Explicitly out of scope (Phase A)

- TOTP / WebAuthn / 2FA
- Session TTL redesign, refresh tokens, server-side session store
- Full CSP nonce pipeline for all Next inline scripts (Phase A ships Report-Only)
- WAF, bot management, IP allowlists
- Migrating media to private bucket + signed URLs
- Multi-admin RBAC
- New npm dependencies without human approval

---

## Definition of Done (epic)

- [x] Security headers present on representative admin + public responses
- [x] Public HTML output cannot execute injected script from post/page body
- [x] Session cookie attributes explicit and tested
- [x] Upload rejects oversize / disallowed types; safe object keys
- [x] Production env rejects weak `AUTH_SECRET`
- [x] Tests + quality gates green; smoke checklist passed
- [x] Docs synced

---

_Phase A is the minimum bar before treating the public site as "safe to put real content on the internet."_
