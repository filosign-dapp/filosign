ALTER TABLE "files" DROP CONSTRAINT "files_organization_id_organizations_id_fk";
ALTER TABLE "files"
ADD CONSTRAINT "files_organization_id_organizations_id_fk"
FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id")
ON DELETE restrict ON UPDATE no action;

ALTER TABLE "user_signatures"
ADD CONSTRAINT "user_signatures_wallet_address_users_wallet_address_fk"
FOREIGN KEY ("wallet_address") REFERENCES "public"."users"("wallet_address")
ON DELETE restrict ON UPDATE no action;

ALTER TABLE "envelope_drafts" ADD COLUMN "head_snapshot_digest" text;
UPDATE "envelope_drafts" SET "head_snapshot" = NULL WHERE "head_snapshot" IS NOT NULL;

CREATE TABLE "analytics_consent_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" text NOT NULL,
	"choice" text NOT NULL,
	"policy_version" text NOT NULL,
	"source" text DEFAULT 'client' NOT NULL,
	"withdrawn_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "analytics_consent_receipts"
ADD CONSTRAINT "analytics_consent_receipts_wallet_address_users_wallet_address_fk"
FOREIGN KEY ("wallet_address") REFERENCES "public"."users"("wallet_address")
ON DELETE cascade ON UPDATE no action;

CREATE INDEX "idx_analytics_consent_wallet_created"
ON "analytics_consent_receipts" USING btree ("wallet_address","created_at");
