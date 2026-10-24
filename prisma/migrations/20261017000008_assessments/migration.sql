-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "assessorId" TEXT NOT NULL,
    "assessorName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "summary" TEXT,
    "decidedAt" TIMESTAMP(3),
    "checklistSnapshot" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_items" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "comment" TEXT,
    "dueDate" TIMESTAMP(3),
    "response" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assessments_versionId_key" ON "assessments"("versionId");

-- CreateIndex
CREATE INDEX "assessments_projectId_idx" ON "assessments"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_items_assessmentId_requirementId_key" ON "assessment_items"("assessmentId", "requirementId");

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "project_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_items" ADD CONSTRAINT "assessment_items_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

