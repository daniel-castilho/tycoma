# Security Hardening — Phase C — Backlog

**Companion documents:**
`tycoma-security-hardening-phase-c-module-spec.md` ·
`tycoma-security-hardening-phase-c-implementation-sequence.md` ·
`tycoma-ai-software-engineer-prompt-security-hardening-phase-c.md`

**Document status:** Complete — `v0.7.0` documented; tag pending human action.

**Epic goal:** Deliver **operational security excellence** on top of Phase A (`v0.5.0`) and Phase B (`v0.6.0`), and close **A/B residuals** that still block calling the security program “done enough” for a personal production site.

**Two pillars**

| Pillar                     | Intent                                                                                                                                                                           |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Operational excellence** | CI vuln gate, dependency update bot, security playbook, media exposure control, backup/restore proof, secrets discipline, `security.txt`, release update runbook + pre-tag smoke |
| **A/B carry-overs**        | CSP endgame, step-up on destructive deletes, optional TOTP 2FA (library approval), optional sliding/remember-me                                                                  |

**Prerequisite on `main`:** Phase A headers/cookies/upload/XSS plain-text posture; Phase B 12h session, Redis step-up (change_password), rate limits, progressive lockout. No 2FA library yet.

---

## Scope Summary

| Lane                                                    | Priority  | Pillar                                  |
| ------------------------------------------------------- | --------- | --------------------------------------- |
| CI `npm audit` gate                                     | Essential | Ops                                     |
| Dependabot or Renovate                                  | Essential | Ops                                     |
| Security section in testing playbook + automations      | Essential | Ops                                     |
| Media signed URLs and/or private bucket                 | Essential | Ops + A residual                        |
| Backup/export + restore drill                           | Essential | Ops                                     |
| Secrets discipline (env/host only; no defaults in prod) | Essential | Ops                                     |
| `security.txt`                                          | Essential | Ops                                     |
| Update runbook + pre-tag smoke                          | Essential | Ops                                     |
| CSP enforce or explicit residual                        | Essential | A residual                              |
| Step-up on delete post/page/media                       | Essential | B residual                              |
| TOTP 2FA                                                | Optional  | B residual — **human library approval** |
| Sliding / remember-me                                   | Optional  | B residual — default skip               |

---

## A. Continuous dependency hygiene (ops)

- [x] **C1** — CI: `npm audit --omit=dev` (or production equivalent) after `npm ci`.
- [x] **C2** — Fail the job on **critical** at minimum; prefer also **high** if the tree can stay green. Document exception process (advisory allowlist only with human note in lessons — never silent forever).
- [x] **C3** — Enable **Dependabot** or **Renovate** for npm (GitHub-native config preferred). Group or limit noise; human merges PRs.
- [x] **C4** — Lockfile remains source of truth (`npm ci` only in CI).

## B. Security tests & playbook (ops)

- [x] **C5** — Expand `docs/testing-playbook.md` with a **Security** section covering:
  - headers (nosniff, referrer, frame, HSTS prod, CSP mode)
  - cookie flags + 12h TTL
  - `AUTH_SECRET` production rule
  - upload reject (size, MIME, SVG, magic)
  - XSS plain-text / no `dangerouslySetInnerHTML` on public site
  - rate limits + lockout
  - step-up (password change + deletes after C13)
- [x] **C6** — Automated tests for any new Phase C behaviour; keep existing A/B suites green.
- [x] **C7** — Release **pre-tag smoke** checklist (headers, login, upload, one delete with step-up, public page).

## C. Media exposure (ops + A residual)

- [x] **C8** — Choose and implement **signed GET URLs** (TTL constant, e.g. 15–60 min) and/or **private bucket** so new objects are not “forever world-readable” by default.
- [x] **C9** — Public site + admin previews consume the signed/controlled URL helper.
- [x] **C10** — Dev/LocalStack path documented; tests for signer/helper.
- [x] **C11** — If signing requires a **new** npm package → stop for human approval. → Implemented with `node:crypto` only, no new dep.

## D. Backup / restore proof (ops)

- [x] **C12** — Content **export** (posts/pages/metadata JSON or equivalent already feasible) with integrity check (checksum).
- [x] **C13** — Documented **restore drill**: import or restore steps on a clean local stack; record time and result in release notes or lessons once.
- [x] **C14** — Encryption-at-rest: rely on host/volume encryption where applicable; do **not** build a KMS product. Document “secrets and backups live only on encrypted host storage / operator-controlled env” in runbook.
- [x] **C15** — Never commit export dumps or real secrets.

## E. Secrets discipline (ops)

- [x] **C16** — Confirm production boot still rejects weak/`AUTH_SECRET` placeholders (Phase A); extend checks only if new secrets are added (signing keys, security contact).
- [x] **C17** — `.env.example` documents required prod secrets without real values; README/runbook: secrets only via host env / vault — never in git.
- [x] **C18** — CI and app must not log secrets.

## F. security.txt (ops)

- [x] **C19** — Serve `/.well-known/security.txt` (RFC 9116): Contact, Preferred-Languages (`en`, `pt-BR`), Expires policy.
- [x] **C20** — Contact from env (e.g. `SECURITY_CONTACT`) with safe fallback documented for dev.

## G. Update runbook + pre-tag smoke (ops)

- [x] **C21** — Short runbook in `docs/` (e.g. `docs/release-runbook.md` or section under testing playbook):
  1. merge Dependabot/Renovate carefully
  2. `npm ci` · audit · test · lint · typecheck · build
  3. pre-tag smoke (C7)
  4. tag/release notes
- [x] **C22** — Link runbook from README Documentation table.

## H. CSP endgame (A residual)

- [x] **C23** — Inventory why `script-src`/`style-src` need `'unsafe-inline'`. → Kept Report-Only in Phase C; nonce pipeline is a follow-up epic (lesson).
- [x] **C24** — Enforce CSP **only** if admin + public keep working without fragile hacks; else keep Report-Only and write an explicit residual in `docs/lessons.md`.
- [x] **C25** — Optional: `Cross-Origin-Opener-Policy: same-origin` on admin if compatible. → Implemented via `next.config.ts`.

## I. Step-up on destructive actions (B residual)

- [x] **C26** — Require existing Redis step-up (10 min, time-boxed reuse) for **delete post**, **delete page**, **delete media** (single-item minimum; bulk if already present and cheap). → Bulk delete also gated.
- [x] **C27** — Reuse change-password step-up UX; no second mechanism.
- [x] **C28** — Tests: delete without step-up fails; with step-up succeeds.

## J. Optional: TOTP 2FA (B residual)

- [x] **C29** — Human names approved library **or** “skip 2FA in Phase C”. → Skipped (locked decision); residual in lessons.
- [x] **C30** — If approved: setup, login challenge, recovery codes hashed via existing hasher port, disable requires step-up. → N/A.
- [x] **C31** — If skipped: residual stays in lessons.

## K. Optional: sliding / remember-me (B residual)

- [x] **C32** — Default **skip**. Only if human prioritizes after essentials.

## L. Docs & release

- [x] **C33** — README Current State, CHANGELOG, `docs/releases/v0.7.0.md`, tasks checkboxes, lessons (audit CI, Dependabot/Renovate, CSP outcome, signed media, backup drill, step-up deletes, 2FA decision).

---

## Out of scope

- Passkeys / WebAuthn, multi-admin RBAC, WAF-as-product
- Full enterprise DR/KMS
- Re-opening SVG uploads
- Prisma 7
- Hand-rolled TOTP

---

## Definition of Done (epic)

- [x] CI audit gate active
- [x] Dependabot or Renovate configured
- [x] Playbook Security section + pre-tag smoke
- [x] Media signed/private path live
- [x] Export + one documented restore drill
- [x] Secrets/runbook discipline documented
- [x] `security.txt` live
- [x] Update runbook linked from README
- [x] CSP enforced **or** residual explicit
- [x] Deletes require step-up
- [x] 2FA shipped **or** explicitly skipped
- [x] Gates green; docs synced (v0.7.0) → `npm test` 142/142, lint, typecheck, build, purity grep all clean; tag `v0.7.0` created by human on 2026-08-16.

---

_Phase C = ops excellence + finish A/B security debt that is still load-bearing._
