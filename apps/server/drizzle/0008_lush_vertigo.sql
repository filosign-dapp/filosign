ALTER TABLE "access_requests" ADD COLUMN "billing_interval" text;--> statement-breakpoint
ALTER TABLE "access_requests" ADD COLUMN "seat_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "access_requests" ADD COLUMN "created_checkout_intent_id" uuid;--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_created_checkout_intent_id_checkout_intents_id_fk" FOREIGN KEY ("created_checkout_intent_id") REFERENCES "public"."checkout_intents"("id") ON DELETE set null ON UPDATE no action;