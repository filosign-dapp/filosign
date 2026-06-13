ALTER TABLE "platform_invites" ADD COLUMN IF NOT EXISTS "email_body" text;--> statement-breakpoint
ALTER TABLE "platform_invites" ADD COLUMN IF NOT EXISTS "email_variant" text DEFAULT 'warm' NOT NULL;
