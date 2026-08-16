# Security Hardening — Phase C — Implementation Sequence

**Companions:** module-spec · backlog · AI prompt
**Target release:** v0.7.0

---

## Guiding principles

1. Do not regress Phase A cookies/headers/upload or Phase B 12h TTL, rate limits, lockout, Redis step-up.
2. No new npm dependency without human approval.
3. Ops artifacts (runbook, playbook, security.txt) are **Done criteria**, not afterthoughts.
4. Prefer extending ports (`StepUpStore`, media URL helpers) over new frameworks.

---

## Order

### Step 1 — CI audit + dependency bot (C1–C4)

1. Add `npm audit --omit=dev` to CI; fail on critical (and high if feasible).
2. Add Dependabot or Renovate config for npm.
3. Fix or human-document any immediate audit blockers.

**Exit:** PRs get vuln signal; main CI encodes audit.

### Step 2 — Step-up on deletes (C26–C28)

1. Gate delete post/page/media use cases on `StepUpStore`.
2. Admin UI reuses step-up password prompt.
3. Tests.

**Exit:** Destructive deletes need recent re-auth.

### Step 3 — Media signed/private URLs (C8–C11)

1. Implement signed GET (or private bucket + sign).
2. Wire public/admin consumers.
3. Tests + LocalStack notes.

**Exit:** Controlled media access path exists.

### Step 4 — Backup/export + restore drill (C12–C15)

1. Export path with checksum.
2. One restore drill documented (local clean stack).
3. No dumps in git.

**Exit:** Operator can prove recovery once.

### Step 5 — Secrets + security.txt (C16–C20)

1. Env example + any new vars.
2. `/.well-known/security.txt`.

### Step 6 — CSP decision (C23–C25)

1. Inventory unsafe-inline.
2. Enforce or write residual lesson.

### Step 7 — Playbook + runbook + smoke (C5–C7, C21–C22)

1. Security section in testing playbook.
2. `docs/release-runbook.md` (or equivalent) with update + pre-tag smoke.
3. README link.

### Step 8 — Optional 2FA / sliding

Only with human approval; default skip sliding.

### Step 9 — Release docs (C33)

README, CHANGELOG, `docs/releases/v0.7.0.md`, lessons, task checkboxes.

---

## Definition of Done (sequence)

- [ ] Steps 1–7 complete
- [ ] Step 8 resolved (shipped or skipped)
- [ ] Step 9 docs for v0.7.0
- [ ] `npm test && npm run lint && npm run typecheck && npm run build` green

---

_Essentials before optional 2FA. A tree with audit+bot, delete step-up, signed media, backup drill, runbook, and CSP decision is already operational excellence._
