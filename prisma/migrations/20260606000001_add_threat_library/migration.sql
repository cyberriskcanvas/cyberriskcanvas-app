-- CreateTable
CREATE TABLE "threat_library_entries" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stride" TEXT NOT NULL,
    "cweId" TEXT,
    "description" TEXT,
    "componentTypeHint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "threat_library_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "threat_library_entries_projectId_idx" ON "threat_library_entries"("projectId");

-- AddForeignKey
ALTER TABLE "threat_library_entries" ADD CONSTRAINT "threat_library_entries_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
