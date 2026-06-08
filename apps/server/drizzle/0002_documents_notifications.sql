CREATE TABLE "notification_dismissals" (
	"wallet" text NOT NULL,
	"type" text NOT NULL,
	"entity_id" text NOT NULL,
	"dismissed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "notification_dismissals" ADD CONSTRAINT "notification_dismissals_wallet_users_wallet_address_fk" FOREIGN KEY ("wallet") REFERENCES "public"."users"("wallet_address") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_notification_dismissals_wallet_type_entity" ON "notification_dismissals" USING btree ("wallet","type","entity_id");
--> statement-breakpoint
CREATE INDEX "idx_notification_dismissals_wallet" ON "notification_dismissals" USING btree ("wallet");
--> statement-breakpoint
CREATE INDEX "idx_files_updated_piece" ON "files" USING btree ("updated_at" DESC,"piece_cid" DESC);
--> statement-breakpoint
CREATE INDEX "idx_envelope_drafts_updated_id" ON "envelope_drafts" USING btree ("updated_at" DESC,"id" DESC);
