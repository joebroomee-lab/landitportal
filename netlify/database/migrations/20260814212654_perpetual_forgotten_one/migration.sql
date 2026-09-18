CREATE TABLE "companies" (
	"id" text PRIMARY KEY,
	"company_name" text NOT NULL,
	"contact_name" text NOT NULL,
	"work_email" text NOT NULL UNIQUE,
	"company_size" text,
	"industry" text,
	"role_title" text,
	"seniority" text,
	"deal_size" text,
	"ote" text,
	"tools" jsonb DEFAULT '[]',
	"timeline" text,
	"notes" text,
	"status" text DEFAULT 'active' NOT NULL,
	"access_token" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" text PRIMARY KEY,
	"rep_id" text NOT NULL,
	"company_id" text NOT NULL,
	"role_title" text,
	"match_reason" text,
	"status" text DEFAULT 'matched' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY,
	"match_id" text NOT NULL,
	"sender_type" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reps" (
	"id" text PRIMARY KEY,
	"full_name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"photo_url" text,
	"linkedin_url" text,
	"in_sales" boolean,
	"job_title" text,
	"not_in_sales_category" text,
	"industries" jsonb DEFAULT '[]',
	"deal_size" text,
	"tools" jsonb DEFAULT '[]',
	"ote" text,
	"location" text,
	"availability" text,
	"bio" text,
	"pitch_video_choice" text,
	"pitch_video_url" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"access_token" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_rep_id_reps_id_fkey" FOREIGN KEY ("rep_id") REFERENCES "reps"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_company_id_companies_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_match_id_matches_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE;