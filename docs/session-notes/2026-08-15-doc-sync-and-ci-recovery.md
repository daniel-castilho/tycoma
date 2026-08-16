# Session notes — 2026-08-15 → 2026-08-16

**Session goal:** fix documentation drift in `main` and recover the broken CI.
**Status at end of session:** shipped. `main` is at `e8177be`, CI green, working tree clean.

---

## What was done in this session

### 1. Doc-sync hygiene pass (the original task)

- **AGENTS.md**
  - Added **Critical rule 9** — *Doc sync is part of Done* (the 5-file checklist).
  - Added **Critical rule 10** — *Commit `package-lock.json` whenever `npm install` mutates it*
    (learned later in this session).
  - Commands section now calls out `.nvmrc` (`24`) and CI/local Node parity.
- **docs/coding-standards.md** — added §8 *Doc sync* bullet list pointing back at
  `AGENTS.md` rule 9. Discarded an unrelated uncommitted WIP rewrite that contained
  Portuguese text (would have violated the English-only rule).
- **CHANGELOG.md** — added `[v0.3.0]` (content types), `[v0.2.1]` (post-v0.2.0 public-site
  follow-ups + doc-sync rule), and an `[Unreleased]` block (now empty after v0.2.1 was
  cut).
- **README.md** — *Current State* promoted through v0.2.0 → v0.2.1 → v0.3.0; Roadmap trimmed
  accordingly; Documentation table extended with the release notes, AI-prompt task files,
  and the testing playbook; Testing section links `docs/testing-playbook.md`.
- **tasks/tycoma-public-site-*.md** — stripped wrapper markdown fences
  (`### N. tasks/...` and code-fence artifacts) that had been committed by mistake.
- **tasks/tycoma-content-types-*.md** — already existed in the working tree when the
  session started; committed as part of the content-types epic.

### 2. Content-types epic (`v0.3.0`)

- Implemented the Custom Content Types epic that was sitting in the working tree.
- **Bugs caught and fixed by the gates before tag:**
  - unused `ContentTypeField` import (lint warning);
  - 7 typecheck errors: bad relative path in `entries/new/page.tsx`,
    `slug`/`fields`/`undefined` types in `src/app/admin/_actions/content-types.ts`,
    optional fields leaking into test fixtures;
  - **public routes missing entirely** — the epic had marked CT10/CT11 "Done" but the
    `/types/[type]` and `/types/[type]/[slug]` route files did not exist. Built both,
    with `generateMetadata`, canonical URL, `notFound()` for unpublished/missing,
    and a generic field renderer.
- Tagged `v0.3.0` and pushed.

### 3. v0.2.1 patch release

- Promoted the four deferred public-site follow-ups (P3 components, P6 `/posts` index,
  P9 page breadcrumb, P14 favicon from settings), CI hardening, application-test expansion,
  and the new doc-sync rule + testing playbook from `[Unreleased]` to `[v0.2.1]`.
- Wrote `docs/releases/v0.2.1.md`. Tagged and pushed.

### 4. Smoke test against `docker:up`

- Hit 11 representative routes (home, posts index, post detail 404, categories, tags,
  sitemap, two content-type routes, `/admin/setup`, `/admin/login`, `/admin/dashboard`).
  All status codes matched expectations.
- Caught and diagnosed an early 500 on the content-type routes caused by a **stale
  Prisma client in the long-running dev server** — not a real bug, but the diagnostic
  revealed the lockfile drift (next item).

### 5. CI recovery (`07e8a41`)

- **Root cause:** `package-lock.json` was last committed before `v0.1.0`; subsequent
  `npm install` runs on the dev box had grown the dep graph (Prisma `ContentType` /
  `ContentEntry` + Next.js's wasm32 optionals) but never committed the lockfile.
  GitHub Actions' `npm ci` is strict and refused with:
  ```
  npm error Missing: @emnapi/runtime@1.11.3 from lock file
  npm error Missing: @emnapi/core@1.11.3 from lock file
  ```
- **Fix:** `rm -rf node_modules .next package-lock.json && npm install`,
  re-validated with `rm -rf node_modules && npm ci --ignore-scripts`, gates green
  (lint, typecheck, 98/98 tests, build). Commit `07e8a41` + push. CI run `31924663801`
  green in 2m20s.
- **Durable lesson** promoted to `docs/lessons.md` ("npm ci is strict — the lockfile
  must include every transitive entry, including optional platform ones") with
  reference to upstream npm/cli bug [#8726](https://github.com/npm/cli/issues/8726).

---

## Final state at end of session

- **Branch:** `main` at `e8177be`
- **Tags on `origin`:** `v0.1.0`, `v0.2.0`, `v0.2.1`, `v0.3.0`
- **CI:** green on `e8177be` (run `31925235091`, 2m22s)
- **Working tree:** clean
- **Containers:** Mongo / Redis / LocalStack all up and healthy
- **`.next`:** present (from the last smoke-test dev run) — safe to leave; will be
  regenerated on next build
- **`next-env.d.ts`:** reverted to the committed state after the dev run touched it

---

## Pending — to resume in the next session

### Hygiene / tags

- **No tag was cut for the CI fix + doc-sync rule.** The two commits are
  `07e8a41` (lockfile refresh) and `e8177be` (AGENTS.md rule 10 + lesson).
  If you want a tag for these:
  - pick a name (`v0.3.1` patch? `v0.4.0` minor?) — neither affects runtime;
  - follow `AGENTS.md` § *Releases*: `docs/releases/v<...>.md`,
    `CHANGELOG.md` entry, README Current State, push tag.
  - Or skip — both changes are docs-only and a clean patch lockfile, low value to tag.

### Cosmetic / optional

- **CI warning:** GitHub Actions still prints
  *"Node.js 20 is deprecated. The following actions target Node.js 20 but are being
  forced to run on Node.js 24: actions/checkout@v4, actions/setup-node@v4."*
  Cosmetic only. Fix when it bothers you: bump `actions/checkout` and `actions/setup-node`
  to `@v5` (or whichever releases drop Node 20 support intentionally). Not blocking.

### Feature backlog (deliberately deferred, not pending)

These were already on the *Out of scope* lists before this session. Listed here only
so the next session can pick one without re-discovering them.

- Block-based editor / Markdown rendering on the public site (needs human approval for
  a Markdown dependency, per AGENTS.md rule 5).
- Media-typed fields for custom content types (deferred from the content-types backlog).
- Public headless API / webhooks / comments / 301 redirects / revision history /
  automated backup / multi-user roles.
- Prisma 7 upgrade — blocked upstream until Prisma ships a MongoDB driver adapter.

### Conventions established this session (worth re-reading before next task)

- **AGENTS.md rule 9** — every milestone-sized change updates README Current State,
  CHANGELOG, tasks/*, AGENTS.md Known technical debt, and `docs/lessons.md` if a
  durable rule was learned.
- **AGENTS.md rule 10** — every `npm install` that mutates the lockfile commits the
  updated `package-lock.json` in the same change set; local sanity check is
  `rm -rf node_modules && npm ci` before pushing.
- **`docs/lessons.md`** — eight durable rules; the most recent is the lockfile one.

---

## Quick resume checklist (next session)

1. `cd /home/castilho/projects/tycoma`
2. `git status` (should be clean), `git log --oneline -5` (should end at `e8177be`).
3. `gh run list --limit 1` — confirm last CI is still green.
4. Pick the next item from **Pending** above.
5. Re-read `AGENTS.md` § *Critical rules* before touching code.
