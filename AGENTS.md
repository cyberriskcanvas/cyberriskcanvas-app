# AGENTS.md

Guidance for coding agents and new contributors working in this repository. Human-oriented setup and rules are in
[CONTRIBUTING.md](CONTRIBUTING.md); this file is the short version plus the things that are easy to get wrong.

## What this is

CyberRisk Canvas: a self-hosted platform for EU CRA compliance of products. A canvas for the architecture (STRIDE
threats, risks, measures, IEC 62443), SBOM and vulnerability management, CI release gate, CSAF advisories and Art. 14
reporting, generated documents. Next.js 16 (App Router) with a custom server, Prisma 7 on PostgreSQL, Zustand,
next-auth, Socket.IO for live collaboration.

## Commands

```bash
yarn install
yarn prisma:generate                  # src/generated is not committed: run after cloning and after schema changes
docker compose -f docker-compose.local.yml up -d   # Postgres and Redis
yarn prisma:migrate-deploy
yarn dev                              # custom server (server.ts), http://localhost:3000, first admin from ADMIN_EMAIL/ADMIN_PASSWORD

yarn typecheck                        # delete .next/types first if it reports routes that no longer exist
npx eslint . --max-warnings 0         # CI fails on warnings
yarn test                             # vitest, no database needed
yarn build
```

Before you hand work over: typecheck, lint, tests. A change that touches routes, pages or the Dockerfile also needs the
smoke test: start the app against a database and run
`BASE_URL=http://localhost:3000 ADMIN_EMAIL=… ADMIN_PASSWORD=… DATABASE_URL=… node scripts/smoke.mjs core|pro`.

## Layout

```
src/app/          pages and API routes (route handlers authenticate with authenticateRequest or a CI token)
src/actions/      server actions: all mutations; check access first, never call the database from client components
src/lib/          server logic; pure modules are tested in src/lib/__tests__
src/components/   React, one folder per feature
src/i18n/         UI text, English and German, one file per feature
src/data/         static catalogues (CRA, IEC 62443, BSI, templates)
src/utils/        pure helpers, PDF export (pdfmake, shared pieces in utils/pdf.ts)
src/pro/          the only door from the free code into Pro code, see Editions
prisma/           schema and SQL migrations
scripts/          smoke test and the export of the core edition
server.ts         custom server: Next, Socket.IO, background jobs, first-admin bootstrap
```

## Rules that matter

- **Access and licence checks are explicit.** `src/lib/access.ts` (`assertProjectAccess`, `assertProjectWriteAccess`,
  `canAccessProject`) for who may see or change a product; `src/lib/tierGuard.ts` (`requireTierFeature`) or
  `withProLicense` for Pro features; `useTierGuard` in the UI. A new gated feature gets a flag in `src/lib/tierConfig.ts`.
- **Validate input where it enters** (server action or route handler), with pure validators next to the logic
  (`validatePolicy`, `sanitizeRemediation`, …) so they can be unit-tested.
- **Findings have one read path.** `src/lib/findings.ts` (`loadFindings`) joins components, advisory matches and the
  product's triage. Do not query the old `project_vulnerabilities` table; it stays unread for one release. Triage lives in
  `analyses` per product (`src/lib/analysis.ts`), not per version. Matching against OSV is `src/lib/osv.ts`; components
  without a purl with a version are not looked up on purpose.
- **Raw SQL** (`$queryRaw`): tables are snake_case (`@@map`), columns are quoted camelCase (`"projectId"`). Build dynamic
  parts with `Prisma.sql` and `Prisma.join`, never string concatenation.
- **Migrations** are SQL files in `prisma/migrations/<timestamp>_<name>/`. Write the DDL with
  `npx prisma migrate diff --from-schema <old schema> --to-schema prisma/schema.prisma --script`, add data copies by hand,
  and check against a real Postgres that `migrate deploy` applies and `migrate diff --from-config-datasource` is empty.
  Migrations only add; drop columns and tables in a later release.
- **Text for users** goes through `src/i18n/<feature>.ts`: an `en` object, `const de: typeof en`, and the hook of that file.
  German and English must both exist. (The Security Overview page is English only so far.)
- **Tests are unit tests of pure functions** with inline factories, no mocks, no database. If logic needs a test, move it
  out of the action or route into `src/lib` or `src/utils`.
- **Dependencies:** think twice before adding one. `yarn audit --groups dependencies` has to stay at zero.
- **Comments** explain why, not what. A deliberate shortcut gets a `// ponytail:` comment that names the ceiling and the
  upgrade path.
- **Commits:** Conventional Commits (`feat(scope): …`, types in CONTRIBUTING.md), one concern per commit.
- Never commit `.env`, licence keys or anything from `keys/`.

## Editions

The product ships as a **core edition** (open source, this repository's public face) and a **Pro edition** (adds
SBOM and vulnerability management, CI gate, CSAF and Art. 14, assessment, AI, compliance exports). Free code must reach
Pro code only through `src/pro/ui.tsx`, `src/pro/server.ts` and `src/pro/jobs.ts`; in the core edition those three files are
small stand-ins. So:

- never import a Pro module directly from a free file; add an export to the matching `src/pro/*` file and import from there;
- use `PRO_EDITION` from `src/pro/ui` to hide a link or button that would lead to a Pro-only page or route;
- a new page or route that is only part of Pro must not be linked from free code unguarded (the core build would show a 404).

If a file `PRO.md` exists in your checkout, it describes how the two editions are built and released.

## Gotchas

- Two parallel requests can race on "create if missing" rows: use `createMany({ skipDuplicates: true })` (see `getOrg`),
  not `upsert`.
- Next.js 16 needs `server-prelude.cjs` (AsyncLocalStorage) when started through `server.ts`; use the package scripts.
- The Docker image carries a minified server bundle and no sources or source maps; do not copy `src/` into the runner stage.
- Diagram edits are buffered in Redis and flushed to Postgres every few seconds; saves are last-write-wins.
