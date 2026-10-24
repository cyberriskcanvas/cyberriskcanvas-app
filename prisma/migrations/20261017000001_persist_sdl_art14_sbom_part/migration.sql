-- AlterTable
ALTER TABLE "projects" ADD COLUMN "sdlChecklist" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "csaf_drafts" ADD COLUMN "craReporting" JSONB;

-- AlterTable
ALTER TABLE "project_sboms" ADD COLUMN "part" TEXT NOT NULL DEFAULT '';

-- DropIndex
DROP INDEX "project_sboms_versionId_idx";

-- CreateIndex
CREATE INDEX "project_sboms_versionId_part_idx" ON "project_sboms"("versionId", "part");
