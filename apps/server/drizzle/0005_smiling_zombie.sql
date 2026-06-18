CREATE TABLE "terms_acceptance_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" text NOT NULL,
	"terms_version" text NOT NULL,
	"privacy_version" text NOT NULL,
	"acceptance_action" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "terms_acceptance_receipts" ADD CONSTRAINT "terms_acceptance_receipts_wallet_address_users_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_terms_acceptance_wallet_created" ON "terms_acceptance_receipts" USING btree ("wallet_address","accepted_at");