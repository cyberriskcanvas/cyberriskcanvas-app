-- CreateTable
CREATE TABLE "organisation" (
    "id" TEXT NOT NULL DEFAULT 'org',
    "name" TEXT NOT NULL DEFAULT '',
    "publisherName" TEXT,
    "publisherNamespace" TEXT,
    "publisherCategory" TEXT NOT NULL DEFAULT 'vendor',
    "issuingAuthority" TEXT,
    "contactDetails" TEXT,
    "securityTxt" JSONB NOT NULL DEFAULT '{}',
    "craChecklist" JSONB NOT NULL DEFAULT '{}',
    "sdlChecklist" JSONB NOT NULL DEFAULT '{}',
    "updatedByName" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisation_pkey" PRIMARY KEY ("id")
);

-- Take the profile over from the most suitable user (admins first, then whoever filled in a publisher
-- profile, then the oldest) and merge the SDL checklists of all projects: a manufacturer process that is
-- done for one product is done for the organisation. The old columns stay, they are just no longer read.
INSERT INTO "organisation" ("id", "name", "publisherName", "publisherNamespace", "publisherCategory", "issuingAuthority", "contactDetails", "sdlChecklist", "updatedAt")
SELECT 'org',
       COALESCE(u."companyName", ''),
       u."csafPublisherName",
       u."csafPublisherNamespace",
       COALESCE(u."csafPublisherCategory", 'vendor'),
       u."csafIssuingAuthority",
       u."csafContactDetails",
       COALESCE(
         (SELECT jsonb_object_agg(s.k, true)
            FROM (SELECT DISTINCT e.key AS k FROM "projects" p, jsonb_each(p."sdlChecklist") AS e WHERE e.value = 'true'::jsonb) s),
         '{}'::jsonb),
       CURRENT_TIMESTAMP
  FROM "users" u
 ORDER BY (u."role" = 'admin') DESC,
          (u."csafPublisherName" IS NOT NULL OR u."csafContactDetails" IS NOT NULL) DESC,
          u."createdAt" ASC
 LIMIT 1;
