-- CreateTable: project_sbom_components
CREATE TABLE "project_sbom_components" (
    "id" TEXT NOT NULL,
    "sbomId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT,
    "purl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_sbom_components_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_sbom_components_sbomId_idx" ON "project_sbom_components"("sbomId");

-- CreateIndex
CREATE INDEX "project_sbom_components_versionId_idx" ON "project_sbom_components"("versionId");

-- AddForeignKey
ALTER TABLE "project_sbom_components" ADD CONSTRAINT "project_sbom_components_sbomId_fkey" FOREIGN KEY ("sbomId") REFERENCES "project_sboms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: project_vulnerabilities (add lastSeenAt)
ALTER TABLE "project_vulnerabilities" ADD COLUMN "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable: cve_scan_runs
CREATE TABLE "cve_scan_runs" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'running',
    "scannedCount" INTEGER NOT NULL DEFAULT 0,
    "newCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,

    CONSTRAINT "cve_scan_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cve_scan_runs_startedAt_idx" ON "cve_scan_runs"("startedAt");
