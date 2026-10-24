-- AlterTable
ALTER TABLE "project_vulnerabilities" ADD COLUMN     "cvssVector" TEXT;

-- AlterTable
ALTER TABLE "csaf_drafts" ADD COLUMN     "csafVersion" TEXT NOT NULL DEFAULT '2.0',
ADD COLUMN     "licenseExpression" TEXT,
ALTER COLUMN "tlp" SET DEFAULT 'CLEAR';


-- TLP v1 WHITE is TLP v2 CLEAR (CSAF 2.1 / FIRST TLP 2.0)
UPDATE "csaf_drafts" SET "tlp" = 'CLEAR' WHERE "tlp" = 'WHITE';
