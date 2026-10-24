-- AlterTable
ALTER TABLE "projects" ADD COLUMN "iec62443" BOOLEAN NOT NULL DEFAULT false;

-- Projects that already carry IEC 62443 data keep seeing it: a Security Level or IEC mappings on any component
UPDATE "projects" SET "iec62443" = true
WHERE "id" IN (
  SELECT "projectId" FROM "diagrams"
  WHERE "nodes"::text ~ '"securityLevel": "SL-' OR "nodes"::text ~ '"iec62443": \[\{'
);
