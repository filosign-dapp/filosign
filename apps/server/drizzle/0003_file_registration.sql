ALTER TABLE "files" ADD COLUMN "registration_status" text DEFAULT 'registered' NOT NULL;
ALTER TABLE "files" ADD COLUMN "register_error" text;
ALTER TABLE "files" ADD COLUMN "register_attempted_at" timestamp with time zone;

CREATE TABLE "file_register_states" (
	"piece_cid" text PRIMARY KEY NOT NULL,
	"sender" varchar(42) NOT NULL,
	"registration_status" text NOT NULL,
	"register_error" text,
	"register_attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"register_payload_json" jsonb NOT NULL
);
