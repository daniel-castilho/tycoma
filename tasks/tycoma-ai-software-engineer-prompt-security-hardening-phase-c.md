# AI Software Engineer Prompt — Security Hardening Phase C

**Status:** Ready on v0.5.0 + v0.6.0.

---

## Context

Implement **operational excellence** + **A/B security residuals**.

**Read:** `AGENTS.md`, `docs/lessons.md`, `docs/testing-playbook.md`, `docs/releases/v0.5.0.md`, `docs/releases/v0.6.0.md`, Phase C task docs, `next.config.ts`, session-cookie, step-up/lockout adapters, media helpers, `.github/workflows/ci.yml`.

---

## Goal (essentials)

1. CI `npm audit` gate (fail critical+)
2. Dependabot **or** Renovate for npm
3. Step-up on delete post/page/media
4. Signed and/or private media URLs
5. Content export + checksum + one restore drill documented
6. Secrets discipline in env example + runbook language
7. `/.well-known/security.txt`
8. CSP enforce **or** explicit residual in lessons
9. Security section in testing playbook + pre-tag smoke
10. `docs/release-runbook.md` (or equivalent) linked from README
11. Docs → **v0.7.0**

**Optional:** TOTP only if human names library; sliding/remember-me default **skip**.

---

## Non-negotiable

- No new npm deps without approval
- Do not weaken A/B cookie, TTL 12h, lockout, rate limits
- Reuse `StepUpStore`
- No hand-rolled TOTP
- No secret/export dumps in git
- Domain purity rules; do not push unless asked
- Task files pure Markdown if edited

---

## Locked defaults

| Topic           | Decision                                |
| --------------- | --------------------------------------- |
| Release         | v0.7.0                                  |
| Audit           | `--omit=dev`, fail **critical** minimum |
| Step-up deletes | post, page, media                       |
| Step-up TTL     | 10 min, reusable in window              |
| Media           | signed GET preferred (e.g. TTL 30 min)  |
| 2FA / sliding   | skip unless human says otherwise        |
| SVG             | stay blocked                            |

---

## Order

1. CI audit + Dependabot/Renovate
2. Delete step-up + tests/UI
3. Media signed/private URLs
4. Export + restore drill docs
5. security.txt + secrets comments
6. CSP decision
7. Playbook Security + release runbook + README links
8. Optional 2FA only if approved
9. CHANGELOG / README / releases/v0.7.0.md / lessons / checkboxes

---

## Stop and ask if

- Signing needs a new package
- Audit red on vuln you cannot fix without major upgrade
- Human wants 2FA (need library name)
- Enforcing CSP breaks admin with no clear fix

---

## Done report

```markdown
# Phase C report

## CI audit + bot

## Delete step-up

## Media URLs

## Backup/export + restore drill

## security.txt + secrets

## CSP outcome

## Playbook + release runbook

## 2FA (shipped/skipped)

## Docs v0.7.0

## Residuals
