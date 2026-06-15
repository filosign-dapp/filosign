DROP TABLE IF EXISTS "organization_template_documents";
DROP TABLE IF EXISTS "organization_templates";

CREATE TABLE "organization_templates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
	"name" text NOT NULL,
	"head_dek_wrapped_omk" text NOT NULL,
	"head_omk_kem_ciphertext" text NOT NULL,
	"snapshot_json" jsonb NOT NULL,
	"created_by_wallet" text NOT NULL REFERENCES "users"("wallet_address"),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "idx_org_templates_org" ON "organization_templates" ("organization_id");

CREATE TABLE "organization_template_documents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"template_id" uuid NOT NULL REFERENCES "organization_templates"("id") ON DELETE cascade,
	"doc_id" text NOT NULL,
	"s3_key" text NOT NULL,
	"name" text NOT NULL,
	"size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "uidx_org_template_documents_template_doc"
	ON "organization_template_documents" ("template_id", "doc_id");
CREATE INDEX "idx_org_template_documents_template"
	ON "organization_template_documents" ("template_id");
