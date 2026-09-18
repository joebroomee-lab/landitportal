ALTER TABLE "reps" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "reps" ADD COLUMN "login_token" text;--> statement-breakpoint
ALTER TABLE "reps" ADD COLUMN "login_token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "reps" ADD COLUMN "welcome_email_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "reps" ADD COLUMN "approved_email_sent_at" timestamp;