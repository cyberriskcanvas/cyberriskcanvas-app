-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "readiness" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "org_readiness" (
    "id" TEXT NOT NULL DEFAULT 'org',
    "answers" JSONB NOT NULL DEFAULT '{}',
    "updatedByName" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_readiness_pkey" PRIMARY KEY ("id")
);

