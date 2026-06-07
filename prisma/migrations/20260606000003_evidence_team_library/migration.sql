-- CreateTable: team_threat_library_entries
CREATE TABLE "team_threat_library_entries" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stride" TEXT NOT NULL,
    "cweId" TEXT,
    "description" TEXT,
    "componentTypeHint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_threat_library_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "team_threat_library_entries_teamId_idx" ON "team_threat_library_entries"("teamId");

-- AddForeignKey
ALTER TABLE "team_threat_library_entries" ADD CONSTRAINT "team_threat_library_entries_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: measure_evidence
CREATE TABLE "measure_evidence" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "diagramId" TEXT NOT NULL,
    "measureId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "measure_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "measure_evidence_diagramId_measureId_idx" ON "measure_evidence"("diagramId", "measureId");

-- CreateIndex
CREATE INDEX "measure_evidence_projectId_idx" ON "measure_evidence"("projectId");

-- AddForeignKey
ALTER TABLE "measure_evidence" ADD CONSTRAINT "measure_evidence_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "measure_evidence" ADD CONSTRAINT "measure_evidence_diagramId_fkey" FOREIGN KEY ("diagramId") REFERENCES "diagrams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
