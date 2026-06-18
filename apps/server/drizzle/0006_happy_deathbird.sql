ALTER TABLE "terms_acceptance_receipts" ADD COLUMN "terms_sha256" text NOT NULL;--> statement-breakpoint
ALTER TABLE "terms_acceptance_receipts" ADD COLUMN "privacy_sha256" text NOT NULL;--> statement-breakpoint
ALTER TABLE "terms_acceptance_receipts" ADD COLUMN "business_use_attested" boolean NOT NULL;