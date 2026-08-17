# Release Runbook

A short, opinionated procedure for shipping a Tycoma CMS release tag. Follow
top to bottom; the order is load-bearing.

## 1. Confirm Definition of Done

Check the release's milestone checklist (see `tasks/*-implementation-sequence.md`).
The Phase letter must show every DoD bullet ticked before tagging.

| Gate          | Command                                                                                              | Pass condition                                          |
| ------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Lint          | `npm run lint`                                                                                       | exit 0                                                  |
| Type-check    | `npm run typecheck`                                                                                  | exit 0                                                  |
| Unit tests    | `npm test`                                                                                           | exit 0                                                  |
| Audit         | `npm audit --omit=dev --audit-level=high`                                                            | "found 0 vulnerabilities"                               |
| Build         | `npm run build`                                                                                      | exit 0                                                  |
| Backup drill  | `node --no-warnings --experimental-strip-types scripts/backup-roundtrip.mjs > /tmp/backup.json && node --no-warnings --experimental-strip-types scripts/backup-roundtrip.mjs --import /tmp/backup.json` | prints `OK — manifest checksum verified: …`             |
| Mongo dump    | `node --no-warnings scripts/mongo-dump.mjs` (after `npm run docker:up`)                              | prints `✓ archive created` + a SHA-256 line              |
| security.txt  | `curl -i http://localhost:3000/.well-known/security.txt` after `npm run dev`                        | 200 + `Expires:` within one year                        |

If any gate fails, do **not** tag. Fix and re-run.

## 2. Stack up + smoke

```bash
npm run docker:up          # Mongo replica set + Redis + LocalStack S3
npm run prisma:generate
npm run prisma:push        # dev only
npm run build
npm run start              # production build
```

Run the browser smoke in `docs/testing-playbook.md` § Release regression smoke.
Add the § Security regression rows introduced in Phase C (delete step-up,
COOP on admin, security.txt, signed media URLs, audit, backup drill).

## 3. Documentation sync

Per `AGENTS.md` rule 9, **Doc sync is part of Done**. Confirm the five files
are consistent:

1. `README.md` → "Current State" mentions the version
2. `CHANGELOG.md` has an entry under the next version
3. `tasks/*` statuses reflect what shipped
4. `AGENTS.md` → "Known technical debt" is up to date
5. `docs/lessons.md` only if a new durable rule was learned

## 4. Tagging (human action)

The human is the only one who runs:

```bash
git tag -a v0.X.0 -m "v0.X.0 — <short title>"
git push origin v0.X.0
```

Agents and CI never create tags. The release notes live at
`docs/releases/v0.X.0.md` — copy the previous one as a template.

## 5. Post-tag hygiene

- Delete the local `/tmp/backup.json` artefact.
- Reset any dev overrides that promoted the next version string.
- Open the GitHub Actions run and confirm the green badge for `main`.

## 6. Backup protocol

Local development uses bind mounts (`./data/mongo`, `./data/localstack`).
Docker does **not** own these directories — deleting them deletes the
database. Back up before anything risky.

**Manifest backup (metadata only, Phase C § Backup round-trip):**

```bash
node --no-warnings --experimental-strip-types scripts/backup-roundtrip.mjs > /tmp/backup.json
node --no-warnings --experimental-strip-types scripts/backup-roundtrip.mjs --import /tmp/backup.json
# expected: OK — manifest checksum verified: …
```

**Full Mongo dump (use before destructive migrations):**

```bash
npm run docker:up
node --no-warnings scripts/mongo-dump.mjs
# expected:
#   → mongodump → data/dumps/<timestamp>
#   ✓ dump complete
#   → tar czf data/dumps/<timestamp>.tgz
#   ✓ archive created
#   SHA-256: <hex>
#   Size:    <bytes> bytes
```

The dump lands under `data/dumps/` (gitignored). Move the `.tgz` artefact
to off-host storage before tagging.

**Restore from a dump:**

```bash
tar xzf data/dumps/<timestamp>.tgz -C /tmp/restore
mongorestore --uri "$DATABASE_URL" --drop /tmp/restore/<dbname>
```

Restore drills are out of CI scope (Phase C residual) — run them by hand
once per quarter and record the timestamp in `docs/lessons.md` if anything
surprises you.
