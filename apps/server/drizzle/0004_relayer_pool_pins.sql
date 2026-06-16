ALTER TABLE "file_register_states" ADD COLUMN IF NOT EXISTS "assigned_relayer_address" text;
--> statement-breakpoint
ALTER TABLE "file_register_states" ADD COLUMN IF NOT EXISTS "pending_tx_hash" text;
--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "assigned_relayer_address" text;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "assigned_relayer_address" text;
