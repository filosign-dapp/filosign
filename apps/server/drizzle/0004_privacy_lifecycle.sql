CREATE TABLE "privacy_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"subject_wallet_address" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"assignee_wallet_address" text,
	"legal_hold_reason" text,
	"closure_note" text,
	"internal_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "privacy_requests"
ADD CONSTRAINT "privacy_requests_subject_wallet_address_users_wallet_address_fk"
FOREIGN KEY ("subject_wallet_address") REFERENCES "public"."users"("wallet_address")
ON DELETE cascade ON UPDATE no action;

ALTER TABLE "privacy_requests"
ADD CONSTRAINT "privacy_requests_assignee_wallet_address_users_wallet_address_fk"
FOREIGN KEY ("assignee_wallet_address") REFERENCES "public"."users"("wallet_address")
ON DELETE set null ON UPDATE no action;

CREATE INDEX "idx_privacy_requests_subject_created"
ON "privacy_requests" USING btree ("subject_wallet_address","created_at");

CREATE INDEX "idx_privacy_requests_status"
ON "privacy_requests" USING btree ("status");

CREATE TABLE "privacy_erasure_ledger" (
	"id" uuid PRIMARY KEY NOT NULL,
	"subject_wallet_address" text NOT NULL,
	"action" text NOT NULL,
	"executed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"replay_required" boolean DEFAULT true NOT NULL,
	"context_json" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "privacy_erasure_ledger"
ADD CONSTRAINT "privacy_erasure_ledger_subject_wallet_address_users_wallet_address_fk"
FOREIGN KEY ("subject_wallet_address") REFERENCES "public"."users"("wallet_address")
ON DELETE cascade ON UPDATE no action;

CREATE INDEX "idx_privacy_erasure_ledger_subject_executed"
ON "privacy_erasure_ledger" USING btree ("subject_wallet_address","executed_at");

CREATE INDEX "idx_privacy_erasure_ledger_replay_required"
ON "privacy_erasure_ledger" USING btree ("replay_required");
