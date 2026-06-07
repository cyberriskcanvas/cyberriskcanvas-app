# Contributing to CyberRisk Canvas

Thank you for your interest in contributing. This document covers everything you need to get started.

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

**Prerequisites:** Node.js 20+, Yarn, Docker

```bash
# 1. Fork and clone
git clone https://github.com/your-fork/cyberrisk-canvas.git
cd cyberrisk-canvas

# 2. Start local services
docker compose -f docker-compose.local.yml up -d

# 3. Install dependencies
yarn install

# 4. Configure environment
cp .env.example .env
# Edit .env - set ADMIN_EMAIL, ADMIN_PASSWORD, and secrets

# 5. Apply database migrations
yarn prisma:migrate-deploy

# 6. Start the dev server
yarn dev
```

The app runs at `http://localhost:3000`. The admin user is created automatically on first start.

### Type checking

```bash
yarn typecheck
```

---

## Project Structure

```
src/
  app/          # Next.js App Router pages and API routes
  actions/      # Next.js Server Actions (data mutations)
  components/   # React components, organised by feature
  hooks/        # Custom React hooks
  lib/          # Shared server-side utilities (auth, db, license, access)
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
- **License gating** goes through `src/lib/tierGuard.ts` - use `requireTierFeature` / `checkTierFeature`
- **No `withRLS`** - Row-Level Security has been removed; use direct `prisma` calls with explicit access checks

---

## Submitting Changes

1. Create a branch from `main`: `git checkout -b fix/your-description`
2. Make your changes and ensure `yarn typecheck` passes
3. Commit using the [commit message format](#commit-messages) below
4. Push and open a Pull Request against `main`
5. Fill in the PR template

Pull requests are reviewed within a few business days. Please keep PRs focused - one concern per PR is easier to review and merge.

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
