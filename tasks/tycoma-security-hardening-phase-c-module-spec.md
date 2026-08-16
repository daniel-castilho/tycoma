# Security Hardening — Phase C — Technical Specification

**Status:** Planning · **Target:** v0.7.0

---

## 1. Purpose

| Pillar                 | Deliverables                                                                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Operational excellence | Audit CI, Dependabot/Renovate, playbook, signed/private media, export/restore drill, secrets discipline, security.txt, release runbook + smoke |
| A/B residuals          | CSP endgame, step-up on deletes, optional 2FA, optional sliding                                                                                |

---

## 2. As-built (do not regress)

- CSP Report-Only + `'unsafe-inline'` script/style
- Public body plain text + XSS regression test
- Session 12h; cookie helper; Redis step-up 10 min for change_password
- Upload 10 MiB, image allowlist, magic bytes, SVG blocked
- CI: lint, typecheck, test, build — **add audit**
- No TOTP library

---

## 3. CI & dependency automation

- `npm audit --omit=dev` with `--audit-level=critical` (or stricter).
- Dependabot/Renovate: weekly npm PRs; human review.
- Exception process: lesson entry with advisory id + expiry intent.

---

## 4. Step-up expansion

Reuse `StepUpStore` (Redis, TTL 10 min, reuse within window).

| Action                     | Step-up      |
| -------------------------- | ------------ |
| change_password            | yes (exists) |
| delete post / page / media | **yes**      |

---

## 5. Media URLs

**Preferred:** time-limited **signed GET** (TTL constant, e.g. 30 min) via media infrastructure port/helper.
**Alternative:** private bucket + sign only.

Public `S3_PUBLIC_BASE_URL` forever-open is not the Phase C end state for new objects.
New package for signing → human approval.

---

## 6. Backup / restore

- Export content metadata + bodies (and media manifest if cheap) to downloadable archive/JSON.
- Checksum (SHA-256) recorded with export.
- Restore drill: documented steps on empty local DB; one successful run noted in lessons/release.
- At-rest encryption = host responsibility; app does not invent KMS.

---

## 7. CSP

Inventory → enforce if safe → else Report-Only + explicit residual (Next inline constraints).
Optional COOP on `/admin`.

---

## 8. security.txt
```

Contact: <SECURITY_CONTACT>
Preferred-Languages: en, pt-BR
Expires: <date or policy>

```

Path: `/.well-known/security.txt`.

---

## 9. Release runbook (minimum)

1. Review bot PRs
2. `npm ci` · audit · lint · typecheck · test · build
3. Smoke: headers, login, upload, step-up delete, public page
4. Tag + release notes

---

## 10. Optional TOTP

Only after `APPROVED_TOTP_LIB=...` from human. Ports in auth; no hand-rolled RFC 6238.

---

## 11. Definition of Done

Matches backlog DoD for essentials; optional lanes explicit in lessons.
