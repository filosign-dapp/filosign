CREATE TABLE "file_comments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"file_piece_cid" text NOT NULL,
	"author_wallet" text NOT NULL,
	"ciphertext" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "file_comments" ADD CONSTRAINT "file_comments_file_piece_cid_files_piece_cid_fk" FOREIGN KEY ("file_piece_cid") REFERENCES "public"."files"("piece_cid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_comments" ADD CONSTRAINT "file_comments_author_wallet_users_wallet_address_fk" FOREIGN KEY ("author_wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_file_comments_piece" ON "file_comments" USING btree ("file_piece_cid");--> statement-breakpoint
CREATE INDEX "idx_file_comments_piece_created" ON "file_comments" USING btree ("file_piece_cid","created_at");
