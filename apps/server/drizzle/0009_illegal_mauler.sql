CREATE TABLE "system_template_documents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"system_template_id" uuid NOT NULL,
	"doc_id" text NOT NULL,
	"s3_key" text NOT NULL,
	"name" text NOT NULL,
	"size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"plaintext_sha256" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "system_templates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"snapshot_json" jsonb NOT NULL,
	"meta_json" jsonb NOT NULL,
	"content_fingerprint" text NOT NULL,
	"created_by_wallet" text NOT NULL,
	"published_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "system_template_documents" ADD CONSTRAINT "system_template_documents_system_template_id_system_templates_id_fk" FOREIGN KEY ("system_template_id") REFERENCES "public"."system_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_templates" ADD CONSTRAINT "system_templates_created_by_wallet_users_wallet_address_fk" FOREIGN KEY ("created_by_wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_system_template_documents_template_doc" ON "system_template_documents" USING btree ("system_template_id","doc_id");--> statement-breakpoint
CREATE INDEX "idx_system_template_documents_template" ON "system_template_documents" USING btree ("system_template_id");--> statement-breakpoint
CREATE INDEX "idx_system_templates_status_published" ON "system_templates" USING btree ("status","published_at");