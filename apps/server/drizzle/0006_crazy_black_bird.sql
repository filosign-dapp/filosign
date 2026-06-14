CREATE TABLE "product_feedback" (
	"id" uuid PRIMARY KEY NOT NULL,
	"wallet_address" text NOT NULL,
	"organization_id" uuid,
	"feature_area" text NOT NULL,
	"route" text,
	"rating" integer,
	"message" text,
	"piece_cid" text,
	"prompt_type" text DEFAULT 'global' NOT NULL,
	"trigger" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "product_feedback" ADD CONSTRAINT "product_feedback_wallet_address_users_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_feedback" ADD CONSTRAINT "product_feedback_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_product_feedback_wallet" ON "product_feedback" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "idx_product_feedback_created_at" ON "product_feedback" USING btree ("created_at");