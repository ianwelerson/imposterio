-- CreateTable
CREATE TABLE "companies" (
    "cnpj" TEXT NOT NULL,
    "legalName" TEXT,
    "tradeName" TEXT,
    "status" TEXT,
    "mainCnae" TEXT,
    "uf" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastFetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("cnpj")
);

-- CreateTable
CREATE TABLE "company_partners" (
    "id" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "partnerName" TEXT NOT NULL,
    "partnerNameKey" TEXT NOT NULL,
    "maskedCpf" TEXT,
    "cpfMid" TEXT,
    "partnerCnpj" TEXT,
    "qualification" TEXT,
    "joinedAt" TIMESTAMP(3),
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_transactions" (
    "id" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "value" DECIMAL(14,2) NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER,
    "counterparty" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "companies_uf_idx" ON "companies"("uf");

-- CreateIndex
CREATE INDEX "company_partners_cpfMid_partnerNameKey_idx" ON "company_partners"("cpfMid", "partnerNameKey");

-- CreateIndex
CREATE INDEX "company_partners_partnerNameKey_idx" ON "company_partners"("partnerNameKey");

-- CreateIndex
-- NULLS NOT DISTINCT (PostgreSQL 15+) makes the unique constraint treat
-- two rows with NULL `maskedCpf` as duplicates. Without it, juridical-
-- person partners (where maskedCpf is null) could be inserted repeatedly
-- because Postgres considers NULL values as distinct by default.
CREATE UNIQUE INDEX "company_partners_cnpj_partnerName_maskedCpf_key" ON "company_partners"("cnpj", "partnerName", "maskedCpf") NULLS NOT DISTINCT;

-- CreateIndex
CREATE INDEX "company_transactions_cnpj_type_year_idx" ON "company_transactions"("cnpj", "type", "year");

-- CreateIndex
CREATE INDEX "company_transactions_counterparty_idx" ON "company_transactions"("counterparty");

-- CreateIndex
CREATE UNIQUE INDEX "company_transactions_cnpj_type_sourceKey_key" ON "company_transactions"("cnpj", "type", "sourceKey");

-- AddForeignKey
ALTER TABLE "company_partners" ADD CONSTRAINT "company_partners_cnpj_fkey" FOREIGN KEY ("cnpj") REFERENCES "companies"("cnpj") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_transactions" ADD CONSTRAINT "company_transactions_cnpj_fkey" FOREIGN KEY ("cnpj") REFERENCES "companies"("cnpj") ON DELETE CASCADE ON UPDATE CASCADE;
