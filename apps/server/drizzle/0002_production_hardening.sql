-- Production hardening: drop dead columns; compliance bundles on R2 only.
TRUNCATE TABLE "compliance_export_logs";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "last_active_at";
--> statement-breakpoint
ALTER TABLE "file_document_views" DROP COLUMN IF EXISTS "last_viewed_at";
--> statement-breakpoint
ALTER TABLE "file_document_views" DROP COLUMN IF EXISTS "view_count";
--> statement-breakpoint
ALTER TABLE "compliance_export_logs" DROP COLUMN "bundle_json";
--> statement-breakpoint
ALTER TABLE "compliance_export_logs" ADD COLUMN "storage_key" text NOT NULL;
