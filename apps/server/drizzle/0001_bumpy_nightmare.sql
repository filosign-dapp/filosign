CREATE TABLE "job_outbox" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"last_error" text,
	CONSTRAINT "job_outbox_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE INDEX "idx_job_outbox_unprocessed" ON "job_outbox" USING btree ("processed_at","created_at");--> statement-breakpoint
CREATE INDEX "idx_job_outbox_processed_at" ON "job_outbox" USING btree ("processed_at");