ALTER TABLE "matches" ADD COLUMN "rep_decision" text;
ALTER TABLE "matches" ADD COLUMN "rep_decided_at" timestamp;
ALTER TABLE "matches" ADD COLUMN "company_decision" text;
ALTER TABLE "matches" ADD COLUMN "company_decided_at" timestamp;
ALTER TABLE "matches" ADD COLUMN "match_reason_for_rep" text;
ALTER TABLE "matches" ADD COLUMN "match_reason_for_company" text;
