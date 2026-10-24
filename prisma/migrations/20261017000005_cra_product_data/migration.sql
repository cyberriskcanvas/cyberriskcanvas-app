-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "craChecklist" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "craClass" TEXT,
ADD COLUMN     "intendedPurpose" TEXT,
ADD COLUMN     "supportPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "supportPeriodRationale" TEXT;

