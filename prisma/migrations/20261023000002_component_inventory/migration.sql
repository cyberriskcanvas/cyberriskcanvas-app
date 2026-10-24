-- AlterTable
ALTER TABLE "project_sbom_components" ADD COLUMN     "cpe" TEXT,
ADD COLUMN     "direct" BOOLEAN,
ADD COLUMN     "hashes" JSONB,
ADD COLUMN     "licenses" TEXT[],
ADD COLUMN     "supplier" TEXT,
ADD COLUMN     "type" TEXT;

