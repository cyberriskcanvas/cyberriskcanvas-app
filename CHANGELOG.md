# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - unreleased

A guided CRA platform for small development teams: the roadmap leads through the whole lifecycle, and what belongs to the manufacturer is kept once above the products.

### Added

- **CRA roadmap**: ten stations from classification to after the release, computed from the project data, each with a "continue" button. Product class with conformity path (Art. 32), intended purpose, support period, product-wide CRA checklist with guidance.
- **Architecture check**: eleven rules over the architecture model; findings can be adopted as threats or dismissed with a reason; optional gate condition `require=model`.
- **CRA readiness self-assessment** (28 questions, 7 areas) and **assessor review and approval workflow** (Pro): frozen version, per-requirement verdicts, findings, locked approval, audit log, PDF report.
- **Documents**: Annex II user information, EU declaration of conformity draft, Annex VII form with coverage in the PDF dossier.
- **CI/CD**: live-product tests (DAST, TLS, port scan compared with the architecture model), **release from the pipeline** (`POST /api/ci/release`, Action input `release`), **issue sync** (`public/ci/sync-issues.sh`), pull request comment with the gate result; for GitLab the gate result as a JUnit test report in the merge request and an updated merge request comment (`GET /api/ci/gate?format=junit`, `CRC_JUNIT`, `CRC_MR_COMMENT`).
- **CI findings with severity**: SAST, secrets, vulnerability-scan and DAST runs list their findings one by one (severity, rule, location) in the SBOM & vulnerabilities tab. The severity comes from SARIF `security-severity` (Trivy, CodeQL), else a CRITICAL/HIGH/MEDIUM/LOW rule tag, else the level. Each product has a **release gate threshold** ("fails from critical/high/medium/low", default high) that also applies to runs already uploaded; secrets always block, `CRC_FAIL_ON` overrides it per pipeline.
- **Post-market**: built-in CVE monitoring (default every 24 h), actively exploited detection from the CISA KEV catalogue, **one Art. 14 reporting case per incident** with the statutory deadlines, reminders by webhook and optional email.
- **Affected status with remediation**: triage can mark a finding as affected and say what users can do (fixed version, workaround, mitigation, none available, no fix planned). Exported as `known_affected` + `remediations` in CSAF and as `exploitable` with a response in CycloneDX VEX; the release gate accepts an affected finding once a fix, workaround or mitigation exists.
- **Own vulnerabilities** in the CSAF wizard: vulnerabilities in your own code (not in any SBOM) with CVSS 3.x, CWE, affected versions, remediation and acknowledgments, published as a `csaf_security_advisory`. Valid against the CSAF 2.0 and 2.1 schemas.
- **Organisation area** (`/organisation`, next to the products; administrators edit, everyone reads): the manufacturer's own roadmap with five stations: profile and publisher, security contact (saved security.txt and CVD policy settings with downloads), the vulnerability-handling requirements that hold for the whole organisation (VH.5, VH.6, VH.6a, VH.8a), the BSI TR-03185 SDL checklist, and the organisation part of the readiness self-assessment. Products inherit the requirement decisions and can override them in their own checklist.
- **Status overview of all products** on the project list: an organisation strip, roadmap progress with the current station, release gate, open high+ findings, Art. 14 cases, support end and assessment per product, as cards or as a table.
- **Vulnerability management** (in the spirit of Dependency-Track, built into the platform):
  - **Advisory catalogue**: advisories from OSV.dev are stored in the database with severity, CWEs, fix versions, **EPSS** score and CISA KEV flag, and matched per component once for all products.
  - **Triage with history**: the decision (status, justification, remediation, *suppressed*) belongs to the product and stays when an SBOM is replaced or a new version starts; every change is recorded with user and comment (`GET /api/projects/{id}/vulnerabilities/{id}/history`).
  - **Component inventory**: licenses, hashes, supplier, CPE and direct/transitive per component from CycloneDX, SPDX 2 and SPDX 3 (also the BSI export); `GET /api/components` and a search in the Security Overview answer "which products contain log4j 2.14, GPL code or CVE-x?".
  - **Policies** (Security Overview): rules over licenses (SPDX ids or groups strong/weak copyleft, permissive), missing license, blocked components (purl pattern), severity, EPSS, KEV and CWE. A violation of a blocking policy fails the release gate unless the product team waives the component with a reason.
  - **Monitoring of released versions**: the daily scan covers the active version and the frozen versions of products still in their support period.
  - **Metrics**: daily snapshot per version (open findings per severity, audited, suppressed, exploited, policy violations, risk score) and a 90-day trend per product and across products.
  - **CycloneDX VEX 1.6** export (`GET /api/projects/{id}/sbom/export?format=cyclonedx-vex`).
- Full German and English UI.
- CSAF 2.1 (Committee Specification Draft 03) as a preview next to CSAF 2.0; SPDX 3.0.1 export; persistent triage across SBOM re-uploads.

### Changed

- **One view for everyone** instead of guided and expert: a project always opens on the roadmap. The component panel is reduced to Overview, Assets, Threats & risks and Tests: threats, risks and measures are one flow, one card per threat (confirm, rate, treat; the card that needs a person starts open), with a "to do here" strip on top. The per-component CRA tab is gone: CRA decisions are made once for the product in the roadmap checklist.
- **IEC 62443 is a project option** ("Also assess against IEC 62443" in the product data, off by default). Only then Security Level, IEC part, the IEC tab, the IEC page and score in the PDF, and the IEC dashboard parts appear. The PDF names its method from the data (template-based draft, confirmed by the team, or manual TARA).
- **Documents tab** next to the advisories: the generated documents (manufacturer data, Annex II user information, Annex VII technical documentation, declaration of conformity) with their status, and the uploaded evidence. The File and Analyse menus are canvas tools and only show on the architecture tab; notes are a toolbar button in every tab. An architecture-check finding on the roadmap now opens the canvas with the check.
- The OSCAL export now uses the product and organisation CRA decisions first, like the Statement of Applicability.
- **Orientation in every tab**: a "next step" bar under the tabs shows the current roadmap station and leads to its next action or back to the roadmap; open Art. 14 reporting cases show as a banner on every tab (red when a deadline has passed) with a direct link to the cases, which no longer wait for the triage in the CSAF wizard. A one-time card on the roadmap explains how roadmap, tabs and organisation fit together.
- **Names that describe the task**: the tabs are now "Architecture & risks", "SBOM & vulnerabilities" and "Advisories & reporting"; the first CSAF step is "Findings"; the per-product page formerly called "Dashboard" is "Reports & exports" (its SDL tab points to the Organisation area); the project list is titled "Products".
- **Publisher profile and contact moved from the user to the organisation.** CSAF exports, the roadmap and the documents use the organisation's values.
- **The SDL checklist is organisation-wide** instead of per project.
- An **actively exploited** (CISA KEV) unresolved finding blocks the release gate whatever the severity threshold; suppressed findings never block.
- The release gate treats `affected` findings without a fix, workaround or mitigation as untriaged.
- The CVE re-scan runs inside the app by default; the Docker profile is optional.

### Upgrade notes

- Database migrations run on start and only add; nothing is deleted. Projects that already carry IEC 62443 data (a Security Level or IEC mappings) get the IEC option switched on by the migration; the old `taraMode` column is no longer read. The old per-user profile columns and the per-project SDL checklist stay in the database but are no longer read.
- The migration copies the publisher profile of the first administrator who filled one in into the organisation, and merges the SDL checklists of all projects (an item done in any project counts as done). **An administrator should check the Organisation area after the update.**
- API clients that enumerate vulnerability statuses must accept the new value `affected`.
- **Vulnerability data moves to new tables** (`vulnerabilities`, `vulnerability_matches`, `analyses`). The migration copies existing findings and every triage decision (the newest one wins between versions); `project_vulnerabilities` and the legacy `sbom_*` tables stay unread for one release. Finding ids in the API are now opaque strings (they were row ids); use the `id` from the list. Findings with a triage decision now show that decision in every version of the product.
- **Components without a package URL (purl) with a version are no longer looked up** (the old lookup assumed the npm ecosystem for them, which produced false matches for firmware and system packages). They are listed as "no purl" in the inventory and can be flagged by a policy. Matches the old lookup produced for such components are not migrated.
- An SBOM with more than 20 000 components (`SBOM_MAX_COMPONENTS`) is rejected instead of being cut at 1 000.
- `POST /api/sbom/upload` (the old per-node import, no UI used it) is removed.

---

## [1.4.1] - 2026-09-11

### Fixed

- **Drag-and-drop on http deployments**: Dragging components from the sidebar onto the canvas silently failed on instances served over plain http. `crypto.randomUUID()` is only available in a secure context (https or localhost), so the drop handler threw before the node was created. A `getRandomValues`-based fallback is now installed on the client, which also restores the affected threat, risk, measure, SBOM, and security test entry paths.
- **Clipboard buttons without https**: Copying the generated API key and the `security.txt` content used `navigator.clipboard`, which is likewise unavailable in a non-secure context. Both now fall back to a legacy copy path.
- **Onboarding tour blocking the canvas**: The tour overlay captured pointer events outside its spotlight, so components could not be dragged while the tour was running — even though step 1 asks the user to do exactly that. The overlay is now hidden.
- **Silent drop failures**: Errors in the canvas drop handler are logged and surfaced as a banner instead of leaving the user without feedback.

### Changed

- Optimized the multi-stage Docker build, reducing the production image size by roughly 85%.

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
