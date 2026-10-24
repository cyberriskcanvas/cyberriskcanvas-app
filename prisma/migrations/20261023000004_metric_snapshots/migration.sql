-- CreateTable
CREATE TABLE "metric_snapshots" (
    "id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "versionId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "critical" INTEGER NOT NULL,
    "high" INTEGER NOT NULL,
    "medium" INTEGER NOT NULL,
    "low" INTEGER NOT NULL,
    "findings" INTEGER NOT NULL,
    "audited" INTEGER NOT NULL,
    "suppressed" INTEGER NOT NULL,
    "exploited" INTEGER NOT NULL,
    "policyFail" INTEGER NOT NULL,
    "policyWarn" INTEGER NOT NULL,
    "components" INTEGER NOT NULL,
    "unanalysable" INTEGER NOT NULL,
    "vulnerableComponents" INTEGER NOT NULL,
    "riskScore" INTEGER NOT NULL,

    CONSTRAINT "metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "metric_snapshots_projectId_day_idx" ON "metric_snapshots"("projectId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "metric_snapshots_day_versionId_key" ON "metric_snapshots"("day", "versionId");

-- AddForeignKey
ALTER TABLE "metric_snapshots" ADD CONSTRAINT "metric_snapshots_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "project_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

