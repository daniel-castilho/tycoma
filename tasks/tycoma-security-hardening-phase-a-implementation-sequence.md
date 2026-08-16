# Security Hardening — Phase A — Implementation Sequence

**Companion docs:** `tycoma-security-hardening-phase-a-module-spec.md` · `tycoma-security-hardening-phase-a-backlog.md` · `tycoma-ai-software-engineer-prompt-security-hardening-phase-a.md`

**Document status:** Planning.

---

## Guiding principles

1. **Security changes are still hexagonal:** validation and policy live in domain/application or small pure helpers; HTTP wiring stays in `app/` / `proxy` / `next.config`.
2. **No new dependencies without human approval** (`AGENTS.md`). Prefer platform features (Next headers, Zod, existing Redis limiter).
3. **Do not break local dev:** HSTS and `Secure` cookies must be env-aware.
4. **Vertical slices:** each slice = policy + wiring + test + short smoke note.
5. **Doc sync is part of Done** for this epic.

---

## Phase order

### Step 1 — Secret policy (P1–P4)

**Why first:** fails closed in production; zero UI risk.

1. Tighten `src/shared/env.ts` production rules for `AUTH_SECRET`.
2. Tests for schema behaviour.
3. Update `.env.example` comments only (no real secrets).

**Exit:** production boot with weak secret fails; dev still works with documented local secret.

---

### Step 2 — Session cookie attributes (C1–C5)

**Why early:** pairs with auth; small surface.

1. Find set/clear cookie call sites.
2. Centralize cookie options factory if duplication exists.
3. Apply HttpOnly / Secure / SameSite / Path / Max-Age.
4. Unit-test the options factory.

**Exit:** login sets safe cookie; logout clears it; attributes verified.

---

### Step 3 — Security headers (H1–H7)

1. Implement headers in the chosen ownership point (`next.config.ts` and/or `proxy.ts`).
2. Env-gate HSTS.
3. CSP: prefer **Content-Security-Policy-Report-Only** first if enforce breaks Next/admin; document; tighten when safe.
4. Smoke: curl/`fetch` headers on `/` and `/admin/login`.

**Exit:** nosniff, referrer, frame protection, CSP (report-only or enforce) visible; dev unbroken.

---

### Step 4 — HTML sanitization (S1–S5)

1. Confirm how body is stored and rendered today (plain vs HTML).
2. If dependency needed → **stop for human approval**.
3. Apply sanitize/escape on **public** render paths first.
4. Optional sanitize-on-save in content write use cases.
5. Tests with malicious payloads.

**Exit:** public pages do not execute injected script; tests cover payloads.

---

### Step 5 — Media upload hardening (U1–U7)

1. Constants for max size + allowlist.
2. Validate in application or infrastructure adapter used by `POST /api/media` (policy in one place).
3. Server-generated storage keys.
4. SVG policy (block default).
5. Tests for reject paths; keep session requirement.

**Exit:** bad uploads rejected; good images still work in admin + public.

---

### Step 6 — Verification & docs (V1–V3)

1. `npm test` · `lint` · `typecheck` · `build`
2. Manual smoke checklist from backlog
3. README / CHANGELOG / tasks / lessons / AGENTS debt if needed

---

## Recommended order for extra fixes

If a header breaks an admin screen: fix the specific directive, don’t disable all headers.
If sanitization breaks intentional formatting: narrow allowlist, don’t remove sanitizer.
If upload limits break legitimate large images: raise constant with human OK, don’t remove check.

---

## Definition of Done (sequence)

- [ ] Step 1 Secret policy
- [ ] Step 2 Cookie attributes
- [ ] Step 3 Headers
- [ ] Step 4 HTML sanitization
- [ ] Step 5 Upload hardening
- [ ] Step 6 Verification & docs

**Target milestone:** `v0.3.0` (or next patch if you prefer labeling as security-only).

---

_Ship Phase A before investing in 2FA or session redesign (Phase B)._
