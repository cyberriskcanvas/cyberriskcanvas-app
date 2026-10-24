-- CreateTable
CREATE TABLE "ci_tokens" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "createdById" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ci_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ci_runs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "tokenId" TEXT,
    "source" TEXT NOT NULL,
    "part" TEXT NOT NULL DEFAULT '',
    "result" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "metrics" JSONB NOT NULL,
    "commit" TEXT,
    "ref" TEXT,
    "url" TEXT,
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ci_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ci_tokens_keyHash_key" ON "ci_tokens"("keyHash");

-- CreateIndex
CREATE INDEX "ci_tokens_projectId_idx" ON "ci_tokens"("projectId");

-- CreateIndex
CREATE INDEX "ci_runs_versionId_source_part_createdAt_idx" ON "ci_runs"("versionId", "source", "part", "createdAt");

-- CreateIndex
CREATE INDEX "ci_runs_projectId_idx" ON "ci_runs"("projectId");

-- AddForeignKey
ALTER TABLE "ci_tokens" ADD CONSTRAINT "ci_tokens_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ci_runs" ADD CONSTRAINT "ci_runs_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "project_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ci_runs" ADD CONSTRAINT "ci_runs_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "ci_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

