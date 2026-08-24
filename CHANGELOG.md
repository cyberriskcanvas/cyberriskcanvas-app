# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.4.0] - 2026-08-24

### Added

- **BSI TR-03183-H Module H & Statement of Applicability (SoA)**: Support for CRA Annex VIII full quality assurance based on ISO/IEC 27001 + ISO 9001 quality processes. Includes an automated SoA generator exporting CRA applicability statements in JSON, CSV, and Markdown formats (`/api/projects/[id]/soa`).
- **NIST OSCAL v1.1.0 JSON Export**: Standardized machine-readable assessment results export (`/api/projects/[id]/oscal`) linking canvas architecture, threats, BSI risk evaluation, and CRA controls per BSI TR-03183-1 Section 7.
- **BSI TR-03185 Secure Software Lifecycle Catalog**: Comprehensive checklist of manufacturer requirements (`PROD.DEV`, `PROD.TEST`, `PROD.FIX`, `PROD.REL`), Open-Source FLOSS controls (`GV`, `LE`, `QA`, `BR`, `VM`), and Artificial Intelligence governance rules (`AI.GOV.01`, `AI.TEST.01`).

---

## [1.3.0] - 2026-08-23

### Added

- **BSI TR-03183-2 SBOM Generator & Export**: Export full CycloneDX v1.6 and SPDX v3.0.1 compliant SBOMs with BSI property taxonomy (`bsi:component:filename`, `executable`, `archive`, `structured`, `effectiveLicense`, SHA-512 hashes) and strict separation from vulnerability data.
- **BSI TR-03183-3 security.txt & CVD-Policy Generator**: RFC 9116 / RFC 9580 generator with ordered contacts (PSIRT, CSIRT, Web Reporting), OpenPGP key references, preferred languages, and CVD policy templates with guaranteed response SLAs.
- **CRA Article 14 Statutory Reporting Tracker**: Timeline and countdown tracker for 24h Early Warning, 72h Vulnerability Notification, and 14-day Final Report obligations to CSIRT (CERT-Bund) and ENISA.

---

## [1.2.0] - 2026-08-23

### Added

- **BSI TR-03183-1 Standard Asset Catalog**: Predefined data, functional, and security assets from Tables 1–3 with baseline C/I/A ratings (1–5) and amplifier support (`PII.*`, `BusinessData.*`, `Functions.*`, `Security.*`).
- **BSI Environment / Likelihood Calculator (TR-03183-1 Annex D)**: Objective likelihood determination based on interface restrictions, access restrictions, and user capabilities using the formula `round(1 + Interface * Access * UserCapability) * 4`.
- **BSI Risk Acceptance Validation**: Enforce explicit justification rationale for accepting moderate, high, or critical risks ($\ge 3$) according to BSI TR-03183-1 §5.14.3.
- **Component Scope Classification**: Tag components as *Placed Component* (on-market product), *RDPS Backend* (manufacturer cloud), or *External 3rd-Party* per CRA Art. 3(1)/(2) and TR-03183-H.
- **Harmonized CRA Requirements (BSI TR-03183-1 Annex B)**: Full coverage of official CRA Annex I Part I (`ER.0–ER.14a`) and Part II (`VH.1–VH.8a`) IDs and regulatory texts with legacy ID alias support.

---

## [1.1.0] - 2026-08-23

### Changed

- Upgraded base Docker images and CI pipelines to Node.js 26 (`node:26-alpine`)
- Replaced `corepack` configuration with `npm install -g yarn` across Dockerfiles and CI workflows
- Upgraded dependencies to latest releases:
  - `ioredis` v6.0.0
  - `tailwind-merge` v3.6.0 (improved Tailwind CSS v4 class conflict resolution)
  - `dotenv` v17.4.2
  - `next` 16.3.2 & `next-auth` 5.0.0-beta.32
  - `@prisma/client` & `prisma` 7.9.1
  - `react` & `react-dom` 19.2.8
  - `@anthropic-ai/sdk` 0.120.0
  - `@xyflow/react` 12.11.3
  - `lucide-react` 1.33.0
  - `react-joyride` 3.2.0
  - `pg` 8.23.0, `tsx` 4.23.12, `zustand` 5.0.15

---

## [1.0.0] - 2026-06-06

First stable release of CyberRisk Canvas - a self-hosted, open-core TARA tool
for automotive and industrial cybersecurity teams.

### Canvas & TARA Workflow

- Visual drag-and-drop canvas built on React Flow - place components, data flows, and trust boundaries
- Detail panel for every node and edge: name, description, STRIDE classification, risk rating, and treatment tracking
- STRIDE threat tagging (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege)
- Risk matrix with likelihood × impact scoring and colour-coded severity levels
- IEC 62443 security level assessment and control baseline mapping
- Project-scoped threat library - reusable threat catalogue with CWE references and component-type hints
- Project notes with last-edited attribution

### Version Management *(Pro)*

- Explicit project versioning - each project carries numbered versions (v1, v2, …)
- Freeze a version to lock the TARA state for audits; work continues on a new active version
- Diagram snapshot history with per-save messages and author attribution
- Frozen versions preserve the full canvas and TARA data at the point of freeze

### SBOM & Vulnerability Management *(Pro)*

- SBOM import - CycloneDX JSON/XML and SPDX JSON formats
- SBOMs are scoped to a specific project version
- Automatic vulnerability lookup via OSV.dev after import
- Per-vulnerability status tracking: `open`, `in_triage`, `not_affected`, `fixed`
- Justification fields for VEX-style status decisions
- Node-level SBOM attachment inside the canvas (component-scoped)

### Continuous CVE Monitoring *(Pro)*

- Scheduled re-scan of every component on record against OSV.dev, triggered by an external cron calling `/api/internal/cve-scan`
- Cross-project Security Overview dashboard - aggregated active/critical/high/medium/low counts, per-project breakdown, and last-scan status at a glance
- Outgoing alert channels (Slack, Microsoft Teams, or generic JSON webhook) notify on newly discovered findings above a configurable severity threshold
- Existing findings are left untouched on re-scan - only `lastSeenAt` is refreshed, preserving user triage decisions

### CSAF Advisory Generation *(Pro)*

- Full CSAF 2.0 draft workflow - title, tracking ID, TLP classification, doc status
- Lifecycle states: `DRAFT → REVIEW → PUBLISHED → ARCHIVED`
- Aggregate severity, revision history, and publisher profile
- Advisory export scoped globally across all project versions
- Per-user CSAF publisher profile (name, namespace, category, issuing authority, contact details)

### AI Threat Analysis *(Pro)*

- Claude-powered threat suggestion engine - analyses selected components and data flows
- STRIDE-aligned suggestions with severity and treatment recommendations
- Configurable via `ANTHROPIC_API_KEY` environment variable; disabled gracefully when absent

### Attack Path Visualisation *(Pro)*

- Automatic computation of multi-hop attack paths across the architecture diagram
- Colour-coded by exploitability and impact chain length

### PDF Export *(Pro)*

- Audit-ready PDF report generated client-side via jsPDF
- Covers canvas thumbnail, STRIDE table, risk ratings, treatment status, and IEC 62443 baseline

### Document Attachments

- File attachments per project stored on the server filesystem
- Accessible to all team members with project access

### Real-Time Collaboration

- Socket.IO-based live presence - see who is editing and where their cursor is
- Canvas changes propagate to all connected users without page refresh
- Redis-backed session store for multi-instance deployments

### Teams & Access Control

- Two team types: **product teams** (own projects) and **review teams** (read access across projects)
- Team leads and members roles
- Project ownership tracked per user and per team

### API Access *(Pro)*

- REST API with OpenAPI 3.1 documentation available at `/api/api-docs`
- Bearer-token authentication via personal API keys
- API keys hashed with SHA-256; prefix shown for identification (`crc_…`)
- Endpoints: projects, diagrams, documents, SBOM, user profile

### Admin Panel

- User management: create, edit, deactivate users; reset passwords
- Team management: create teams, assign members and roles
- Licence management: install and validate a Pro licence key
- Licence validation cached for 24 hours with offline grace period
- Alert channel management: configure Slack/Teams/generic webhook notifications for new CVE findings, with severity threshold and a one-click delivery test

### Onboarding

- Interactive step-by-step onboarding wizard (react-joyride) for new users
- Skippable at any step; progress stored per user

### Feedback System

- In-app feedback board: bug reports, feature requests, and general feedback
- Upvote system; admin-managed status (`open`, `planned`, `done`, `closed`)

### Authentication & Security

- NextAuth v5 with bcrypt credential authentication
- No OAuth, no SMTP required for self-hosted deployments
- First admin user bootstrapped from `ADMIN_EMAIL` / `ADMIN_PASSWORD` at startup
- Role-based access: `user` and `admin`
- Single Sign-On *(Pro)* - generic OIDC (Keycloak, Okta, Auth0, …) and Microsoft Entra ID, enabled per-deployment via environment variables
- Just-in-time account provisioning on first SSO login

### Internationalisation

- Full bilingual UI - English (EN) and German (DE)
- Language preference stored per session

### Infrastructure & Deployment

- Self-hosted via Docker Compose (`docker-compose.customer.yml`)
- Next.js 16 with custom Socket.IO server (`server.ts`)
- Server Actions for all mutating operations
- Prisma 7 + PostgreSQL 17 with a clean initial migration
- Redis (ioredis) for real-time session state
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ANTHROPIC_API_KEY` / `LICENSE_KEY` / `CVE_SCAN_SECRET` environment variables, plus optional `OIDC_*` / `ENTRA_ID_*` SSO configuration
- TypeScript 6, Tailwind CSS 4, Vitest test suite

---

*For upgrade instructions and environment variable reference, see [CONTRIBUTING.md](CONTRIBUTING.md).*
