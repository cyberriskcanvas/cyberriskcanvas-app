-- AlterTable
ALTER TABLE "users"
  ADD COLUMN "csafPublisherName"      TEXT,
  ADD COLUMN "csafPublisherNamespace" TEXT,
  ADD COLUMN "csafPublisherCategory"  TEXT NOT NULL DEFAULT 'vendor',
  ADD COLUMN "csafIssuingAuthority"   TEXT,
  ADD COLUMN "csafContactDetails"     TEXT;
