-- ────────────────────────────────────────────────────────────────────────────
-- Migration: Introduce explicit ProjectVersion model
-- ────────────────────────────────────────────────────────────────────────────

-- ── Step 1: Create project_versions ─────────────────────────────────────────

CREATE TABLE "project_versions" (
    "id"           TEXT        NOT NULL,
    "projectId"    TEXT        NOT NULL,
    "number"       INTEGER     NOT NULL,
    "label"        TEXT        NOT NULL DEFAULT '',
    "status"       TEXT        NOT NULL DEFAULT 'active',
    "frozenAt"     TIMESTAMP(3),
    "frozenByName" TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "project_versions_projectId_number_key"
    ON "project_versions"("projectId", "number");

CREATE INDEX "project_versions_projectId_idx"
    ON "project_versions"("projectId");

ALTER TABLE "project_versions"
    ADD CONSTRAINT "project_versions_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Step 2: Seed version 1 for every existing project ───────────────────────
-- gen_random_uuid() is built-in since PostgreSQL 13, no extension needed.

INSERT INTO "project_versions" ("id", "projectId", "number", "label", "status", "frozenAt", "frozenByName", "createdAt")
SELECT
    gen_random_uuid()::text,
    p.id,
    1,
    COALESCE(p."lockedLabel", ''),
    CASE WHEN p."lockedAt" IS NOT NULL THEN 'frozen' ELSE 'active' END,
    p."lockedAt",
    p."lockedByName",
    p."createdAt"
FROM "projects" p;

-- Locked projects need a fresh active version 2
INSERT INTO "project_versions" ("id", "projectId", "number", "label", "status", "createdAt")
SELECT
    gen_random_uuid()::text,
    p.id,
    2,
    '',
    'active',
    CURRENT_TIMESTAMP
FROM "projects" p
WHERE p."lockedAt" IS NOT NULL;

-- ── Step 3: Add versionId to project_sboms ──────────────────────────────────

ALTER TABLE "project_sboms" ADD COLUMN "versionId" TEXT;

UPDATE "project_sboms" s
SET "versionId" = pv.id
FROM "project_versions" pv
WHERE pv."projectId" = s."projectId"
  AND pv."number"    = 1;

DELETE FROM "project_sboms" WHERE "versionId" IS NULL;

ALTER TABLE "project_sboms" ALTER COLUMN "versionId" SET NOT NULL;

ALTER TABLE "project_sboms" DROP CONSTRAINT "project_sboms_projectId_fkey";
DROP INDEX "project_sboms_projectId_idx";

ALTER TABLE "project_sboms"
    ADD CONSTRAINT "project_sboms_versionId_fkey"
    FOREIGN KEY ("versionId") REFERENCES "project_versions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "project_sboms_versionId_idx"  ON "project_sboms"("versionId");
CREATE INDEX "project_sboms_projectId_idx2" ON "project_sboms"("projectId");

-- ── Step 4: Add versionId to project_vulnerabilities ────────────────────────

ALTER TABLE "project_vulnerabilities" ADD COLUMN "versionId" TEXT;

UPDATE "project_vulnerabilities" v
SET "versionId" = s."versionId"
FROM "project_sboms" s
WHERE s.id = v."sbomId";

DELETE FROM "project_vulnerabilities" WHERE "versionId" IS NULL;

ALTER TABLE "project_vulnerabilities" ALTER COLUMN "versionId" SET NOT NULL;

ALTER TABLE "project_vulnerabilities"
    ADD CONSTRAINT "project_vulnerabilities_versionId_fkey"
    FOREIGN KEY ("versionId") REFERENCES "project_versions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "project_vulnerabilities_versionId_idx"  ON "project_vulnerabilities"("versionId");
CREATE INDEX "project_vulnerabilities_projectId_idx2" ON "project_vulnerabilities"("projectId");

-- ── Step 5: Clean up legacy columns from projects ───────────────────────────

ALTER TABLE "projects"
    DROP COLUMN IF EXISTS "lockedAt",
    DROP COLUMN IF EXISTS "lockedByName",
    DROP COLUMN IF EXISTS "lockedLabel";

ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "projects_parentId_fkey";
DROP INDEX IF EXISTS "projects_parentId_idx";
ALTER TABLE "projects" DROP COLUMN IF EXISTS "parentId";
