ALTER TABLE "companies" ADD COLUMN "icp" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "tags" jsonb DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "source_file_keys" jsonb DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "match_tags" jsonb DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "reps" ADD COLUMN "tags" jsonb DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "reps" ADD COLUMN "cv_file_key" text;