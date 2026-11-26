# Contributing to CyberRisk Canvas

Anyone can contribute to any feature through a GitHub fork. For a typo or documentation fix, use the pencil icon on the file in GitHub and follow the prompts to open a pull request. Code and documentation contributions are accepted under the [Apache License 2.0](LICENSE).

## Table of Contents

- [Ways to Contribute](#ways-to-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Submitting Changes](#submitting-changes)
- [Coding Guidelines](#coding-guidelines)
- [Commit Messages](#commit-messages)

---

## Ways to Contribute

- **Bug reports** - Open a [GitHub Issue](../../issues/new?template=bug_report.md)
- **Feature requests** - Open a [GitHub Issue](../../issues/new?template=feature_request.md)
- **Code** - Fix bugs or implement features from the issue tracker
- **Documentation** - Improve the README, add inline comments, or fix typos
- **Security** - See [SECURITY.md](SECURITY.md) for responsible disclosure

For significant changes, please open an issue first to discuss the approach before writing code.

---

## Development Setup

For code changes, use Node.js 26 and Yarn Classic (1.22.x), matching CI. Fork [cyberriskcanvas-app](https://github.com/cyberriskcanvas/cyberriskcanvas-app/fork), then clone your fork.

```bash
git clone https://github.com/YOUR-USERNAME/cyberriskcanvas-app.git
cd cyberriskcanvas-app
git switch -c my-change
yarn install --frozen-lockfile
DATABASE_URL=postgresql://local:local@localhost:5432/local yarn prisma:generate
yarn eslint . --max-warnings 0
yarn typecheck
yarn test
```

These checks run without a database or external API keys. To run the web app locally, install Docker Compose and copy `.env.example` to `.env`. Set local admin credentials and an auth secret. For a host-based dev server, use a literal PostgreSQL URL with the same password as `POSTGRES_PASSWORD` and host `localhost`, set `REDIS_URL=redis://localhost:6379`, and set `AUTH_URL` and `APP_URL` to `http://localhost:3000`.

```bash
docker compose -f docker-compose.local.yml up -d db redis
yarn prisma:migrate-deploy
yarn dev
```

## Project Structure

```
src/
  app/          # Next.js App Router pages and API routes
  actions/      # Next.js Server Actions (data mutations)
  components/   # React components, organised by feature
  hooks/        # Custom React hooks
  lib/          # Shared server-side utilities (auth, db, access)
  store/        # Zustand client state stores
  types/        # Shared TypeScript types
  i18n/         # Internationalisation strings
  data/         # Static data (IEC 62443 mappings, templates)
prisma/
  schema.prisma # Database schema
  migrations/   # SQL migration history
```

### Key conventions

- **Server Actions** in `src/actions/` handle all data mutations - never call the DB directly from client components
- **Access control** goes through `src/lib/access.ts` - use `assertProjectAccess` / `canAccessProject`
- **No `withRLS`** - Row-Level Security has been removed; use direct `prisma` calls with explicit access checks

---

## Submitting Changes

Commit your changes on your branch, push with `git push -u origin HEAD`, and open a pull request from your fork into `cyberriskcanvas/cyberriskcanvas-app:main`. Describe the change and how you tested it. You can open a draft for early feedback. GitHub Actions runs the project checks on pull requests.

---

## Coding Guidelines

- **TypeScript strict mode** - no `any` unless absolutely necessary and annotated with `eslint-disable`
- **No unused imports** - clean up anything the linter flags
- **Comments only for non-obvious behaviour** - good names are better than comments
- **No backwards-compatibility shims** - this is an active codebase, not a public API
- **Server-side validation** - never trust client input; validate at the Server Action or route handler level
- **Security** - be mindful of OWASP Top 10; avoid SQL injection, XSS, SSRF

---

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org):

```
<type>(<scope>): <short summary>

[optional body]
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

**Examples:**

```
feat(teams): add review team visibility for cross-project access
fix(license): handle timeout when license API is unreachable
docs(readme): update quick start with docker-compose command
refactor(access): consolidate project access checks into access.ts
```

Scope is optional but helpful (e.g. `auth`, `teams`, `license`, `export`, `ai`, `sbom`).
