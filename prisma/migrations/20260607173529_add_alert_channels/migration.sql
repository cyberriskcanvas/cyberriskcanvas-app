-- CreateTable
CREATE TABLE "alert_channels" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'generic',
    "minSeverity" TEXT NOT NULL DEFAULT 'HIGH',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_channels_pkey" PRIMARY KEY ("id")
);

-- RenameIndex
ALTER INDEX "project_sboms_projectId_idx2" RENAME TO "project_sboms_projectId_idx";
