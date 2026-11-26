-- AlterTable
ALTER TABLE "diagrams" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "diagrams_projectId_deletedAt_idx" ON "diagrams"("projectId", "deletedAt");
