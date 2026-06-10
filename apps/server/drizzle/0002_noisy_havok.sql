CREATE TABLE IF NOT EXISTS "notification_dismissals" (
	"wallet" text NOT NULL,
	"type" text NOT NULL,
	"entity_id" text NOT NULL,
	"dismissed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "file_field_completions" (
	"file_piece_cid" text NOT NULL,
	"field_id" text NOT NULL,
	"signer" text NOT NULL,
	"value_kind" text NOT NULL,
	"source_artifact_id" uuid,
	"storage_key" text,
	"content_sha256" text,
	"text_value" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "pk_file_field_completions" PRIMARY KEY("file_piece_cid","field_id")
);
--> statement-breakpoint
ALTER TABLE "file_signer_drafts" ADD COLUMN IF NOT EXISTS "field_completions" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "metadata_json" jsonb;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "is_practice" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "attachment_release_rules" ADD COLUMN IF NOT EXISTS "release_tx_hash" text;--> statement-breakpoint
ALTER TABLE "envelope_attachment_packets" ADD COLUMN IF NOT EXISTS "org_kem_ciphertext" text;--> statement-breakpoint
ALTER TABLE "envelope_attachment_packets" ADD COLUMN IF NOT EXISTS "org_encrypted_packet_dek" text;--> statement-breakpoint
ALTER TABLE "user_activation_state" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_signatures" ADD COLUMN IF NOT EXISTS "kind" text;--> statement-breakpoint
ALTER TABLE "user_signatures" ADD COLUMN IF NOT EXISTS "role" text;--> statement-breakpoint
ALTER TABLE "user_signatures" ADD COLUMN IF NOT EXISTS "storage_key" text;--> statement-breakpoint
ALTER TABLE "user_signatures" ADD COLUMN IF NOT EXISTS "content_type" text;--> statement-breakpoint
ALTER TABLE "user_signatures" ADD COLUMN IF NOT EXISTS "content_sha256" text;--> statement-breakpoint
ALTER TABLE "user_signatures" ADD COLUMN IF NOT EXISTS "typed_meta" jsonb;--> statement-breakpoint
ALTER TABLE "user_signatures" ADD COLUMN IF NOT EXISTS "intrinsic_aspect_ratio" real;--> statement-breakpoint
UPDATE "user_signatures" SET "kind" = 'typed' WHERE "kind" IS NULL;--> statement-breakpoint
UPDATE "user_signatures" SET "role" = 'signature' WHERE "role" IS NULL;--> statement-breakpoint
UPDATE "user_signatures" SET "storage_key" = '' WHERE "storage_key" IS NULL;--> statement-breakpoint
UPDATE "user_signatures" SET "content_type" = 'application/octet-stream' WHERE "content_type" IS NULL;--> statement-breakpoint
UPDATE "user_signatures" SET "content_sha256" = '' WHERE "content_sha256" IS NULL;--> statement-breakpoint
ALTER TABLE "user_signatures" ALTER COLUMN "kind" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_signatures" ALTER COLUMN "role" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_signatures" ALTER COLUMN "storage_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_signatures" ALTER COLUMN "content_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_signatures" ALTER COLUMN "content_sha256" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "default_signature_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "default_initial_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_dismissals" ADD CONSTRAINT "notification_dismissals_wallet_users_wallet_address_fk" FOREIGN KEY ("wallet") REFERENCES "public"."users"("wallet_address") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "file_field_completions" ADD CONSTRAINT "file_field_completions_file_piece_cid_files_piece_cid_fk" FOREIGN KEY ("file_piece_cid") REFERENCES "public"."files"("piece_cid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "file_field_completions" ADD CONSTRAINT "file_field_completions_signer_users_wallet_address_fk" FOREIGN KEY ("signer") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "file_field_completions" ADD CONSTRAINT "file_field_completions_source_artifact_id_user_signatures_id_fk" FOREIGN KEY ("source_artifact_id") REFERENCES "public"."user_signatures"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uidx_notification_dismissals_wallet_type_entity" ON "notification_dismissals" USING btree ("wallet","type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notification_dismissals_wallet" ON "notification_dismissals" USING btree ("wallet");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_field_completions_piece" ON "file_field_completions" USING btree ("file_piece_cid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_envelope_drafts_updated_id" ON "envelope_drafts" USING btree ("updated_at","id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_files_updated_piece" ON "files" USING btree ("updated_at","piece_cid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_signatures_wallet_role_sha" ON "user_signatures" USING btree ("wallet_address","role","content_sha256");--> statement-breakpoint
ALTER TABLE "user_signatures" DROP COLUMN IF EXISTS "data";
