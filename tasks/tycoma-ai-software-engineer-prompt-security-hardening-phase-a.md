# AI Software Engineer Prompt — Security Hardening Phase A

**Status:** Ready for implementation agents.

---

## Project context

Tycoma: single-tenant CMS, hexagonal modular monolith.
Stack: Next.js 16 App Router, React 19, TypeScript strict, Prisma **6.x** + MongoDB, Redis, jose, Argon2id, Zod.
Current product: Admin Dashboard + Public Site MVP (`v0.2.0` lineage).

**Sources of truth (read in order):**

1. `AGENTS.md`
2. `docs/testing-playbook.md` (if present)
3. `docs/coding-standards.md`
4. `docs/lessons.md`
5. `tasks/tycoma-security-hardening-phase-a-module-spec.md`
6. `tasks/tycoma-security-hardening-phase-a-backlog.md`
7. `tasks/tycoma-security-hardening-phase-a-implementation-sequence.md`
8. Code: `src/proxy.ts`, `src/shared/env.ts`, auth login/logout cookie setters, `src/app/api/media/route.ts`, public `(site)` render paths, `next.config.ts`

---

## Goal

Implement **Phase A only**:

1. Production-grade `AUTH_SECRET` policy
2. Explicit session cookie security attributes
3. Security response headers (env-aware HSTS; CSP careful)
4. HTML sanitization/escaping so public pages do not execute stored XSS
5. Media upload hardening (size, type, safe keys, SVG blocked by default)

Do **not** implement 2FA, session TTL redesign, private-bucket migration, or new epics.

---

## Non-negotiable rules

1. Obey `AGENTS.md` boundaries and English-only rule.
2. **No new npm dependency without explicit human approval.** If sanitization requires a library, stop and ask.
3. Do not bump Prisma to 7.
4. Do not weaken auth tests or make extra `/admin` paths public.
5. Do not push remote unless human asks.
6. Prefer small commits with subjects like: `🔒 Harden session cookie flags` (if project emoji convention is active).
7. Doc sync is part of Done.

---

## Implementation order

Follow `tycoma-security-hardening-phase-a-implementation-sequence.md`:

1. Env `AUTH_SECRET` production policy + tests
2. Cookie set/clear attributes + tests
3. Security headers
4. HTML sanitize/escape on public output (+ optional on save)
5. Media upload limits/allowlist/magic/SVG policy + tests
6. Full gates + smoke + docs

---

## How to work

1. Search existing cookie set/clear and body render paths before inventing new layers.
2. Centralize policy in pure helpers or use cases; keep Route Handlers thin.
3. Extend existing `*.test.ts` files where behaviour already has a home.
4. After code: `npm test && npm run lint && npm run typecheck && npm run build`.
5. Manual smoke from the backlog.
6. Update backlog checkboxes + README/CHANGELOG/lessons as required by AGENTS doc-sync rule.

**Stop and ask the human if:**

- A new dependency seems required
- Enforcing CSP breaks the admin UI and the fix is unclear
- Upload allowlist would remove a file type production already needs
- Any change implies shortening JWT TTL or adding 2FA (out of scope)

---

## Done report (mandatory)

```markdown
# Security Hardening Phase A — report

## Implemented

- AUTH_SECRET policy:
- Cookie attributes:
- Headers (list):
- HTML handling:
- Upload hardening:

## Tests added/updated

## Quality gates

## Manual smoke

## Residual risks / follow-ups (Phase B+)

## Docs touched
````

---

_This prompt is Phase A only. Phase B (session lifetime, 2FA) needs a separate epic._

