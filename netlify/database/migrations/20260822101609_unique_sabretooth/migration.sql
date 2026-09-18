CREATE TABLE "meetings" (
	"id" text PRIMARY KEY,
	"match_id" text NOT NULL UNIQUE,
	"scheduled_at" timestamp,
	"status" text DEFAULT 'proposed' NOT NULL,
	"notetaker_requested" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "company_brief" text;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "rep_video_url" text;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "rep_video_updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "matches" ALTER COLUMN "status" SET DEFAULT 'pending_review';--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_match_id_matches_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE;