ALTER TABLE "files" ADD COLUMN "document_sha256" "bytea" NOT NULL DEFAULT decode(repeat('12', 32), 'hex');
ALTER TABLE "files" ALTER COLUMN "document_sha256" DROP DEFAULT;

ALTER TABLE "compliance_export_logs" ADD COLUMN "export_kind" text NOT NULL DEFAULT 'pdf';
ALTER TABLE "compliance_export_logs" ALTER COLUMN "export_kind" DROP DEFAULT;
