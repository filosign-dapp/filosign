-- Pre-production: replace file_signer_amendments audit shape for propose/execute/cancel flow.
DROP TABLE IF EXISTS "file_signer_amendments";

CREATE TABLE "file_signer_amendments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"file_piece_cid" text NOT NULL,
	"old_commitment" "bytea" NOT NULL,
	"new_commitment" "bytea" NOT NULL,
	"status" text NOT NULL DEFAULT 'pending',
	"pending_new_signer_json" jsonb,
	"propose_tx_hash" "bytea" NOT NULL,
	"execute_tx_hash" "bytea",
	"cancel_tx_hash" "bytea",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "file_signer_amendments" ADD CONSTRAINT "file_signer_amendments_file_piece_cid_files_piece_cid_fk" FOREIGN KEY ("file_piece_cid") REFERENCES "public"."files"("piece_cid") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "idx_file_signer_amendments_piece" ON "file_signer_amendments" USING btree ("file_piece_cid");
CREATE INDEX "idx_file_signer_amendments_piece_status" ON "file_signer_amendments" USING btree ("file_piece_cid","status");

ALTER TABLE "file_participants" ADD COLUMN "email_commitment" "bytea";
ALTER TABLE "file_cold_invites" ADD COLUMN "email_commitment" "bytea";

CREATE INDEX "idx_participants_file_email_commitment" ON "file_participants" ("file_piece_cid", "email_commitment");
CREATE INDEX "idx_file_cold_invites_piece_email_commitment" ON "file_cold_invites" ("file_piece_cid", "email_commitment");
