-- AlterTable
ALTER TABLE "project_vulnerabilities" ADD COLUMN     "exploited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "exploitedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "cra_incidents" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cveId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "awareAt" TIMESTAMP(3) NOT NULL,
    "memberStates" TEXT NOT NULL DEFAULT '',
    "measureAvailableAt" TIMESTAMP(3),
    "earlyWarningAt" TIMESTAMP(3),
    "notificationAt" TIMESTAMP(3),
    "finalReportAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "notes" TEXT,
    "remindersSent" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cra_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cra_incidents_projectId_idx" ON "cra_incidents"("projectId");

-- AddForeignKey
ALTER TABLE "cra_incidents" ADD CONSTRAINT "cra_incidents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Move the old per-project Art. 14 tracker state (csaf_drafts.craReporting) into one incident each.
-- The old tracker counted the final report from awareness; here it only becomes due once a measure is available.
INSERT INTO "cra_incidents" ("id", "projectId", "kind", "title", "source", "awareAt", "memberStates", "earlyWarningAt", "notificationAt", "finalReportAt", "createdAt")
SELECT
  'legacy_' || d."id",
  d."projectId",
  'vulnerability',
  'Imported from the previous Art. 14 tracker',
  'manual',
  COALESCE(NULLIF(d."craReporting"->>'awarenessDate', '')::timestamp, d."updatedAt"),
  COALESCE(d."craReporting"->>'affectedMemberStates', ''),
  CASE WHEN (d."craReporting"->>'earlyWarningSubmitted')::boolean THEN d."updatedAt" END,
  CASE WHEN (d."craReporting"->>'vulnerabilityReportSubmitted')::boolean THEN d."updatedAt" END,
  CASE WHEN (d."craReporting"->>'finalReportSubmitted')::boolean THEN d."updatedAt" END,
  d."updatedAt"
FROM "csaf_drafts" d
WHERE d."craReporting" IS NOT NULL
  AND (d."craReporting"->>'earlyWarningSubmitted')::boolean IS NOT NULL;
