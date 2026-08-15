# Twelve-Factor App — Reference & Compliance

The project follows the [Twelve-Factor App](https://12factor.net/) methodology (originating from
Heroku). Goal: a codebase that deploys identically to any environment (dev, staging, prod) with no
code changes, reproducible builds, and easy horizontal scaling.

> **This is a commitment, not a suggestion.** When writing or reviewing code, check the factor
> affected by the change and keep the table below green.

## The 12 factors and how Tycoma complies

| # | Factor           | Tycoma status | Notes |
| - | ---------------- | ------------- | ----- |
| 1 | Codebase         | ✅ One repo, one app | Git repo `daniel-castilho/tycoma`, `main` branch. No per-environment branches. |
| 2 | Dependencies     | ✅ Declared & locked | `package.json` + `package-lock.json` committed. `postinstall: prisma generate` regenerates `@prisma/client` on `npm ci`. |
| 3 | Config           | ⚠️ In progress      | Everything environment-specific lives in env vars (`.env`, see `.env.example`). `AUTH_SECRET` fails fast when missing; Redis/S3 fall back to local dev defaults — keep prod values explicit. **TBD:** validate all config with Zod at boot. |
| 4 | Backing services | ✅ Attached resources | MongoDB, Redis, LocalStack (S3) are external resources addressed by URL (`docker-compose.yml` + env). No embedded servers. |
| 5 | Build, release, run | ⚠️ Partial       | Build = `npm run build`; release = immutable artifact from a commit; run = `next start`. CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests and build on every push. **TBD:** production schema changes via versioned migrations (`prisma migrate deploy`), not `db push`. |
| 6 | Processes        | ✅ Stateless       | Session state lives in a JWT cookie; rate limiting/cache in Redis. No in-memory state assumed across requests. |
| 7 | Port binding     | ✅ Self-contained   | App exposes HTTP via `next start`; no external web server injected. |
| 8 | Concurrency      | ✅ Process-based    | Scales by spawning processes; each is a copy of the same stateless app. |
| 9 | Disposability    | ✅ Fast boot/shutdown | Next.js boots quickly; graceful shutdown on `SIGTERM`. |
| 10 | Dev/prod parity  | ✅ Containers       | `npm run docker:up` (Mongo replica set + Redis + S3) keeps local close to prod. |
| 11 | Logs             | ⚠️ Mostly           | Output goes to stdout (Next.js + `console`). No app writes log files. **TBD:** structured log helper when needed; never log secrets/PII. |
| 12 | Admin processes  | ⚠️ Partial          | One-off tasks run as separate commands, not inside the app (`prisma studio`, `prisma push`). **TBD:** move schema changes to `prisma migrate` for release-time execution. |

Legend: ✅ compliant · ⚠️ partially compliant / has an open TODO.

## Hard rules to keep the list green

- Never hardcode environment-specific values (URLs, secrets, credentials) in code. Read them from
  env vars, with dev-only defaults kept in `.env.example`.
- Secrets live only in env vars / the deployed environment — never in git, code, or logs.
- Every build must be reproducible from the lockfile: `npm ci` then `npm run build`. Do not rely on
  artifacts left in `node_modules`.
- Schema changes are shipped as part of the release (migration step), never applied by hand.
- Local dev must match production dependencies as closely as possible (use `docker-compose`).

## Open TODOs (tracked)

1. Validate all environment variables with Zod at startup (config module) — see "Known technical
   debt" in `AGENTS.md`.
2. Introduce Prisma migrations for production schema changes.
3. Structured logging helper (stdout) and log-level conventions.