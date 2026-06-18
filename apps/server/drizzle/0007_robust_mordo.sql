CREATE TABLE "pilot_addendum_acceptance_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" text NOT NULL,
	"addendum_version" text NOT NULL,
	"addendum_sha256" text NOT NULL,
	"acceptance_action" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "organization_settlement_feature_access" ADD COLUMN "organization_legal_name" text;--> statement-breakpoint
ALTER TABLE "organization_settlement_feature_access" ADD COLUMN "organization_country" text;--> statement-breakpoint
ALTER TABLE "organization_settlement_feature_access" ADD COLUMN "requester_name" text;--> statement-breakpoint
ALTER TABLE "organization_settlement_feature_access" ADD COLUMN "requester_role" text;--> statement-breakpoint
ALTER TABLE "organization_settlement_feature_access" ADD COLUMN "request_ip" text;--> statement-breakpoint
ALTER TABLE "organization_settlement_feature_access" ADD COLUMN "request_user_agent" text;--> statement-breakpoint
ALTER TABLE "access_requests" ADD COLUMN "plan_id" text;--> statement-breakpoint
ALTER TABLE "pilot_addendum_acceptance_receipts" ADD CONSTRAINT "pilot_addendum_acceptance_receipts_wallet_address_users_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_pilot_addendum_wallet_created" ON "pilot_addendum_acceptance_receipts" USING btree ("wallet_address","accepted_at");