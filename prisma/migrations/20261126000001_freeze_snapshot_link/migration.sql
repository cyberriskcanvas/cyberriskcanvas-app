-- AlterTable
ALTER TABLE "diagram_versions" ADD COLUMN     "projectVersionId" TEXT;

-- CreateIndex
CREATE INDEX "diagram_versions_projectVersionId_idx" ON "diagram_versions"("projectVersionId");

-- AddForeignKey
ALTER TABLE "diagram_versions" ADD CONSTRAINT "diagram_versions_projectVersionId_fkey" FOREIGN KEY ("projectVersionId") REFERENCES "project_versions"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- Backfill: link existing freeze snapshots to their frozen version. Until now the only link was the message
-- "Version <n>: <label> - <name>", written in the same transaction as frozenAt. The exact message and time window reduce the chance of a manual
-- version that happens to carry such a message being taken for a snapshot.
UPDATE "diagram_versions" dv
SET "projectVersionId" = pv."id"
FROM "diagrams" d, "project_versions" pv
WHERE dv."diagramId" = d."id"
  AND pv."projectId" = d."projectId"
  AND pv."status" = 'frozen'
  AND pv."frozenAt" IS NOT NULL
  AND dv."projectVersionId" IS NULL
  AND dv."message" = 'Version ' || pv."number" || ': ' || pv."label" || ' - ' || pv."frozenByName"
  AND dv."createdAt" BETWEEN pv."frozenAt" - INTERVAL '5 minutes' AND pv."frozenAt" + INTERVAL '5 minutes';
