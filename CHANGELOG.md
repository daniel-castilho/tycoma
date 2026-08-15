# Changelog

All notable changes to Tycoma will be documented in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this
project intends to follow [Semantic Versioning](https://semver.org/) starting from its first tag.

## [Unreleased]

Nothing has shipped yet — the project is in the planning/scaffolding stage. See
`tycoma-admin-dashboard-backlog.md` and `tycoma-admin-dashboard-implementation-sequence.md` for
what's planned for the first tagged release (target: `v0.1.0`, at the end of the Foundation &
Access Control phase).

### Added

- Project scaffold: directory structure (`setup-tycoma.sh`), `package.json` with pinned versions
  (Node 24 LTS, Next.js 16.3, Prisma 7.9.1)
- Decision: password hashing via Argon2id (`@node-rs/argon2`)
- Decision: testing stack — Jest (unit) + Playwright (e2e)
- Decision: hexagonal boundary enforcement via dependency-cruiser
- Planning docs for the Admin Dashboard epic (`tycoma-admin-dashboard-backlog.md`,
  `tycoma-admin-dashboard-implementation-sequence.md`, `tycoma-admin-dashboard-module-spec.md`,
  `tycoma-ai-software-engineer-prompt-admin-dashboard.md`)

---

_Add a high-level entry here before every tag, per the **Releases** section of `AGENTS.md`._
