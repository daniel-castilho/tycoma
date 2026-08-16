# Session notes — 2026-08-16 (Security Hardening Phase A + v0.5.0 tag)

**Session goal:** implement the **Security Hardening Phase A** epic (HTTP security headers,
HTML sanitization guard, session cookie policy, media upload hardening, `AUTH_SECRET`
production policy) and ship it as `v0.5.0`.
**Status at end of session:** shipped. `main` at `4b756ed`, `v0.5.0` pushed, CI green,
working tree clean.

---

## What was done in this session

### 0. Cleaned four task Markdown files (mandatory first step)

The four planning files had been saved with ```` ```markdown … ``` ```` wrappers and CRLF
line endings. Stripped the fences, normalized LF, and fixed the leading heading on each:

- `tasks/tycoma-security-hardening-phase-a-backlog.md`
- `tasks/tycoma-security-hardening-phase-a-implementation-sequence.md`
- `tasks/tycoma-security-hardening-phase-a-module-spec.md`
- `tasks/tycoma-ai-software-engineer-prompt-security-hardening-phase-a.md`

### 1. `AUTH_SECRET` production policy (P1–P4)

- `src/shared/env.ts` — extracted `parseEnv` (pure) and a separate
  `src/shared/env-instance.ts` (validated singleton). Migrated every adapter that
  previously did `import { env } from "@/shared/env"` (`prisma`, `redis`,
  `jwt-session-issuer`, `s3-object-storage`, `session-cookie`).
- Production rule: `AUTH_SECRET` ≥ 32 chars, no documented placeholders
  (`change-me-to-...`, `changeme`, `secret`, `dev-secret`), no leading/trailing
  whitespace. Dev/test keep the 16-char minimum.
- Build-phase bypass: `NEXT_PHASE === "phase-production-build"` is treated as dev so a
  local build with the placeholder secret still works. The rule bites at runtime.
- Tests: `src/shared/env.test.ts` — 8 cases (dev/prod length, empty, placeholder,
  whitespace, missing DATABASE_URL).

### 2. Session cookie attributes (C1–C5)

- Single source of truth already at `src/app/admin/_lib/session-cookie.ts`
  (`SESSION_COOKIE_OPTIONS`). Attributes already correct (`httpOnly`, `secure` in prod,
  `sameSite: lax`, `path: /`, 7-day `maxAge`).
- Logout in `src/app/admin/_actions/auth.ts` now writes an empty value with `maxAge: 0`
  using the same option object so the browser actually drops the cookie.
- Tests: `src/app/admin/_lib/session-cookie.test.ts` — 5 cases (httpOnly, sameSite, path,
  maxAge, cookie name).

### 3. Security headers (H1–H7)

- `next.config.ts` ships site-wide headers via `headers()`:
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `X-Frame-Options: DENY`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `Content-Security-Policy-Report-Only` baseline (`default-src 'self'`,
    `frame-ancestors 'none'`, no `unsafe-eval`, S3 host allowed for `img-src` /
    `connect-src`)
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains` — **only** when
    both `NODE_ENV === "production"` and `APP_URL` is `https://`.
- `images.dangerouslyAllowSVG` switched to `false` to match the upload policy.

### 4. Stored XSS defence (S1–S5)

- Decision: **no new sanitizer dependency**. Public body is already plain-text inside
  `<pre>` / `<p>` (React escapes). HTML mode would require a human-approved library.
- `src/app/(site)/_components/xss-regression.test.ts` — walks the entire `(site)/`
  subtree and fails if any file references `dangerouslySetInnerHTML`. This is the
  entire stored-XSS defence for Phase A.

### 5. Media upload hardening (U1–U7)

- `src/modules/media/application/use-cases/upload-media.ts`:
  - `MAX_UPLOAD_BYTES = 10 MiB`
  - `ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]`
    (PDF/video/audio removed in Phase A; re-add with explicit human approval).
  - `sniffMimeType` reads magic bytes (JPEG SOI, PNG signature, GIF87a/89a, RIFF/WEBP)
    and the declared MIME must match.
  - **SVG blocked by both MIME (`image/svg+xml`) and extension (`.svg`)**.
  - Storage keys remain `media/${newObjectId()}.${ext}` — server-generated.
- Tests: 7 cases (valid PNG, jpeg/gif/webp accepted, empty, oversize, SVG, MIME-mismatch,
  unknown magic bytes).

### 6. Test runner housekeeping

- `scripts/test-register.mjs` now seeds `process.env` with safe defaults
  (`AUTH_SECRET`, `DATABASE_URL`, `REDIS_URL`, `NODE_ENV=test`) before any module loads,
  so tests that transitively import adapters don't crash on `process.env` reads.
- `package.json` `test` script wraps `src/**/*.test.ts` in single quotes so the shell
  doesn't pre-expand the glob (previously only `env.test.ts` matched).

### 7. Doc sync (AGENTS.md rule 9)

- `tasks/tycoma-security-hardening-phase-a-backlog.md` — every H/S/C/U/P/V box ticked.
- `CHANGELOG.md` — `[v0.5.0]` entry with Added / Changed / Documentation sections.
- `README.md` — *Current State* now leads with `v0.5.0`; Documentation table gets
  `v0.5.0.md`; Roadmap adds v0.5.0; *Deliberately deferred* lists Phase B explicitly.
- `.env.example` — comments document the production bar for `AUTH_SECRET`.
- `docs/lessons.md` — two new durable rules:
  - `next build` forces `NODE_ENV=production` for local builds (detect via `NEXT_PHASE`).
  - Stored XSS is blocked only as long as the public site stays plain text.

### 8. No new npm dependency

Confirmed: **zero** new packages in `v0.5.0`.

---

## Final state at end of session

- **Branch:** `main` at `4b756ed`
- **Tags on `origin`:** `v0.1.0`, `v0.2.0`, `v0.2.1`, `v0.3.0`, `v0.3.1`, `v0.4.0`,
  **`v0.5.0`**
- **CI:** green on `4b756ed`
- **Working tree:** clean
- **Tests:** 121/121
- **Lighthouse-style header check:** nosniff, referrer, XFO, Permissions-Policy,
  CSP-Report-Only on every response; HSTS only on prod+HTTPS.

---

## Pending — to resume in the next session

### Security Hardening Phase B (deliberately deferred, not pending)

- JWT TTL redesign (short-lived access + refresh; server-side session store)
- 2FA / WebAuthn
- Full CSP enforce pipeline (map every Next inline, nonce-based)
- Private-bucket signed URLs
- Rate limit on `POST /api/media`

### Feature backlog (deliberately deferred)

- MF6 — admin entry-list thumbnail column
- Block-based editor / Markdown on the public site (needs human approval for new dep)
- Public headless API / webhooks / comments / 301 redirects / revision history /
  automated backup / multi-user roles
- Prisma 7 upgrade (blocked upstream)

## Quick resume checklist (next session)

1. `cd /home/castilho/projects/tycoma`
2. `git status` (should be clean), `git log --oneline -5` (should end at `4b756ed`).
3. `git tag -l` — confirm `v0.5.0` is on `origin`.
4. Pick the next item from **Pending** above.
5. Re-read `AGENTS.md` § *Critical rules* before touching code.
