-- CreateTable
CREATE TABLE "policies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "violation" TEXT NOT NULL DEFAULT 'fail',
    "operator" TEXT NOT NULL DEFAULT 'any',
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "projectIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_waivers" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "componentKey" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "byName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_waivers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "policy_waivers_policyId_projectId_componentKey_key" ON "policy_waivers"("policyId", "projectId", "componentKey");

-- AddForeignKey
ALTER TABLE "policy_waivers" ADD CONSTRAINT "policy_waivers_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

