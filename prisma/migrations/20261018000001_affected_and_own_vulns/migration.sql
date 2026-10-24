-- AlterTable
ALTER TABLE "project_vulnerabilities" ADD COLUMN     "remediationCategory" TEXT,
ADD COLUMN     "remediationDetails" TEXT,
ADD COLUMN     "remediationUrl" TEXT;

-- CreateTable
CREATE TABLE "own_vulnerabilities" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cveId" TEXT,
    "cweId" TEXT,
    "cvssVector" TEXT,
    "description" TEXT NOT NULL,
    "affectedVersions" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'affected',
    "remediationCategory" TEXT,
    "remediationDetails" TEXT,
    "remediationUrl" TEXT,
    "acknowledgments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "own_vulnerabilities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "own_vulnerabilities_projectId_idx" ON "own_vulnerabilities"("projectId");

-- AddForeignKey
ALTER TABLE "own_vulnerabilities" ADD CONSTRAINT "own_vulnerabilities_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
