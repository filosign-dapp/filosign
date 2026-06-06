ALTER TABLE "files" ADD COLUMN "is_practice" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE "user_activation_milestones" (
	"wallet_address" text NOT NULL,
	"milestone" text NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_activation_milestones_wallet_address_milestone_pk" PRIMARY KEY("wallet_address","milestone")
);
--> statement-breakpoint
ALTER TABLE "user_activation_milestones" ADD CONSTRAINT "user_activation_milestones_wallet_address_users_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_user_activation_milestones_wallet" ON "user_activation_milestones" USING btree ("wallet_address");
--> statement-breakpoint
CREATE TABLE "user_activation_state" (
	"wallet_address" text PRIMARY KEY NOT NULL,
	"practice_piece_cid" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_activation_state" ADD CONSTRAINT "user_activation_state_wallet_address_users_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_activation_state" ADD CONSTRAINT "user_activation_state_practice_piece_cid_files_piece_cid_fk" FOREIGN KEY ("practice_piece_cid") REFERENCES "public"."files"("piece_cid") ON DELETE set null ON UPDATE no action;
