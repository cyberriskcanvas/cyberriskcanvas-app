-- CreateTable
CREATE TABLE "project_sboms" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "componentCount" INTEGER NOT NULL DEFAULT 0,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_sboms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_vulnerabilities" (
    "id" TEXT NOT NULL,
    "sbomId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "osvId" TEXT NOT NULL,
    "cveId" TEXT,
    "summary" TEXT,
    "severity" TEXT,
    "cvssScore" DOUBLE PRECISION,
    "componentName" TEXT NOT NULL,
    "componentVersion" TEXT,
    "componentPurl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "justification" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_vulnerabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "csaf_advisories" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "csaf_advisories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_sboms_projectId_idx" ON "project_sboms"("projectId");

-- CreateIndex
CREATE INDEX "project_vulnerabilities_sbomId_idx" ON "project_vulnerabilities"("sbomId");

-- CreateIndex
CREATE INDEX "project_vulnerabilities_projectId_idx" ON "project_vulnerabilities"("projectId");

-- CreateIndex
CREATE INDEX "csaf_advisories_projectId_idx" ON "csaf_advisories"("projectId");

-- AddForeignKey
ALTER TABLE "project_sboms" ADD CONSTRAINT "project_sboms_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_vulnerabilities" ADD CONSTRAINT "project_vulnerabilities_sbomId_fkey" FOREIGN KEY ("sbomId") REFERENCES "project_sboms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "csaf_advisories" ADD CONSTRAINT "csaf_advisories_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
