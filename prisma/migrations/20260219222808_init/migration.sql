-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'SCRAPED', 'ANALYZED', 'DRAFTED', 'REVIEWED', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "company_name" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scraped_data" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "raw_text" TEXT NOT NULL,
    "meta_description" TEXT,
    "social_links" JSONB,
    "tech_stack_detected" JSONB,
    "scraped_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scraped_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_reports" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "business_model" TEXT NOT NULL,
    "pain_points" JSONB NOT NULL,
    "suggested_solutions" JSONB NOT NULL,
    "revenue_estimation" TEXT,
    "model_used" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_drafts" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "subject_line" TEXT NOT NULL,
    "body_content" TEXT NOT NULL,
    "status" "DraftStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "generation_prompt_version" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leads_domain_key" ON "leads"("domain");

-- CreateIndex
CREATE INDEX "leads_domain_idx" ON "leads"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "scraped_data_lead_id_key" ON "scraped_data"("lead_id");

-- AddForeignKey
ALTER TABLE "scraped_data" ADD CONSTRAINT "scraped_data_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_reports" ADD CONSTRAINT "analysis_reports_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_drafts" ADD CONSTRAINT "email_drafts_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
