CREATE TABLE "blocked_pairs" (
	"id" text PRIMARY KEY,
	"rep_id" text NOT NULL,
	"company_id" text NOT NULL,
	"blocked_by" text NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blocked_pairs_rep_company_unique" UNIQUE("rep_id","company_id")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" text PRIMARY KEY,
	"match_id" text NOT NULL,
	"reported_by" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blocked_pairs" ADD CONSTRAINT "blocked_pairs_rep_id_reps_id_fkey" FOREIGN KEY ("rep_id") REFERENCES "reps"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "blocked_pairs" ADD CONSTRAINT "blocked_pairs_company_id_companies_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_match_id_matches_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE;
