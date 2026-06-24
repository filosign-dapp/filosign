ALTER TABLE "organization_settlement_feature_access" ADD COLUMN "external_wallet_access_requested" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_settlement_feature_access" ADD COLUMN "external_wallet_use_case" text;--> statement-breakpoint
ALTER TABLE "organization_settlement_feature_access" ADD COLUMN "external_wallet_compliance_cert_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "platform_invites" DROP COLUMN "preapprove_payout_access";