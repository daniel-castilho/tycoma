# SMTP Mailer — Backlog

**Companion documents:**
`tycoma-security-hardening-phase-c-module-spec.md` ·
`tycoma-architecture-audit-action-plan.md`

**Document status:** Draft — opened by the architecture audit (Phase 1, item 1.3).

**Epic goal:** Replace the dev-only `consoleMailer` with a real SMTP adapter so password-reset
links are delivered over email in production, and the reset token never touches server logs.

**Prerequisite on `main`:** `Mailer` port now passes `{ appUrl, token }` instead of a prebuilt
`resetUrl` (`src/modules/auth/domain/mailer.ts`), and `consoleMailer` masks the token
(`src/modules/auth/infrastructure/console-mailer.ts`). The token is written only to the recipient
email, never to stdout.

---

## Scope Summary

| Lane                                        | Priority  |
| ------------------------------------------- | --------- |
| SMTP adapter (env-gated)                    | Essential |
| Env config for SMTP                         | Essential |
| Dev/production mailer selection             | Essential |
| Docs + tests                                | Essential |

---

- [ ] **S1** — Add `SMTP_URL`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `MAIL_FROM` to
  `src/shared/env.ts` (no new npm dependency without human approval — implement with
  `nodemailer` **only after** approval, or with plain SMTP via the standard library if feasible).
- [ ] **S2** — Implement `smtp-mailer.ts` in `src/modules/auth/infrastructure/` implementing the
  `Mailer` port; build the reset URL from `{ appUrl, token }` inside the adapter and send it via
  SMTP.
- [ ] **S3** — Keep `consoleMailer` for development only; select the adapter by `NODE_ENV` in
  `src/modules/auth/application/index.ts` (dev → console, production → SMTP).
- [ ] **S4** — Update `docs/release-runbook.md` and `.env.example` with the SMTP variables.
- [ ] **S5** — Tests: unit test for `smtp-mailer` URL construction and a test pinning that no
  token appears in server logs/output in either adapter.