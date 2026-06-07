-- CreateTable
CREATE TABLE "csaf_drafts" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "trackingId" TEXT NOT NULL DEFAULT '',
    "version" TEXT NOT NULL DEFAULT '1',
    "revision" TEXT NOT NULL DEFAULT 'Initial release',
    "docStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "aggregateSeverity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "initialReleaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentReleaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tlp" TEXT NOT NULL DEFAULT 'WHITE',
    "summary" TEXT NOT NULL DEFAULT '',
    "details" TEXT NOT NULL DEFAULT '',
    "publisherName" TEXT NOT NULL DEFAULT '',
    "publisherNamespace" TEXT NOT NULL DEFAULT '',
    "publisherCategory" TEXT NOT NULL DEFAULT 'vendor',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "csaf_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "csaf_drafts_projectId_key" ON "csaf_drafts"("projectId");

-- AddForeignKey
ALTER TABLE "csaf_drafts" ADD CONSTRAINT "csaf_drafts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
