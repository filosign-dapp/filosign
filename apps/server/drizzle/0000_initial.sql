CREATE TABLE "analytics_consent_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" text NOT NULL,
	"choice" text NOT NULL,
	"policy_version" text NOT NULL,
	"source" text DEFAULT 'client' NOT NULL,
	"withdrawn_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "privacy_erasure_ledger" (
	"id" uuid PRIMARY KEY NOT NULL,
	"subject_wallet_address" text NOT NULL,
	"action" text NOT NULL,
	"executed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"replay_required" boolean DEFAULT true NOT NULL,
	"context_json" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "draft_comments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"draft_id" uuid NOT NULL,
	"author_wallet" text,
	"invite_token" text,
	"ciphertext" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "draft_external_shares" (
	"id" uuid PRIMARY KEY NOT NULL,
	"draft_id" uuid NOT NULL,
	"email" text NOT NULL,
	"access_kind" text NOT NULL,
	"invite_token" text NOT NULL,
	"recipient_wallet" text,
	"kem_ciphertext" text,
	"encrypted_dek" text,
	"wrapped_dek" text,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_by_wallet" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "draft_external_shares_inviteToken_unique" UNIQUE("invite_token")
);
--> statement-breakpoint
CREATE TABLE "envelope_draft_documents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"draft_id" uuid NOT NULL,
	"doc_id" text NOT NULL,
	"s3_key" text NOT NULL,
	"name" text NOT NULL,
	"size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "envelope_drafts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"created_by_wallet" text NOT NULL,
	"title" text DEFAULT 'Untitled draft' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"head_snapshot_s_3_key" text,
	"head_snapshot_digest" text,
	"head_dek_wrapped_omk" text,
	"head_omk_kem_ciphertext" text,
	"sent_piece_cid" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "compliance_export_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"file_piece_cid" text NOT NULL,
	"requested_by" text NOT NULL,
	"bundle_version" smallint NOT NULL,
	"bundle_hash" text NOT NULL,
	"storage_key" text NOT NULL,
	"execution_status" text NOT NULL,
	"signatures_snapshot_count" integer NOT NULL,
	"export_kind" text NOT NULL,
	"document_sha256" text,
	"request_user_agent" text,
	"request_ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_acknowledgements" (
	"file_piece_cid" text NOT NULL,
	"wallet" text NOT NULL,
	"ack" text NOT NULL,
	"acknowledged_at" timestamp with time zone NOT NULL,
	"intent_version" text NOT NULL,
	"request_ip" text,
	"request_user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "pk_file_acknowledgements" PRIMARY KEY("file_piece_cid","wallet")
);
--> statement-breakpoint
CREATE TABLE "file_cold_invites" (
	"id" uuid PRIMARY KEY NOT NULL,
	"invite_token" text,
	"file_piece_cid" text NOT NULL,
	"email" text NOT NULL,
	"email_commitment" text NOT NULL,
	"wrapped_encryption_key" text,
	"is_signer" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"claimed_at" timestamp with time zone,
	"claimed_by_wallet" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "file_comments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"file_piece_cid" text NOT NULL,
	"author_wallet" text NOT NULL,
	"ciphertext" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "file_document_views" (
	"file_piece_cid" text NOT NULL,
	"wallet" text NOT NULL,
	"first_viewed_at" timestamp with time zone NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "pk_file_document_views" PRIMARY KEY("file_piece_cid","wallet")
);
--> statement-breakpoint
CREATE TABLE "file_participants" (
	"file_piece_cid" text NOT NULL,
	"wallet" text NOT NULL,
	"role" text NOT NULL,
	"email_commitment" text,
	"kem_ciphertext" text NOT NULL,
	"encrypted_encryption_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "pk_file_participants" PRIMARY KEY("file_piece_cid","wallet")
);
--> statement-breakpoint
CREATE TABLE "file_signatures" (
	"file_piece_cid" text NOT NULL,
	"signer" text NOT NULL,
	"evm_signature" text NOT NULL,
	"dl3_signature" text NOT NULL,
	"onchain_tx_hash" text NOT NULL,
	"completed_field_ids" jsonb NOT NULL,
	"completions_root" text NOT NULL,
	"leaf_schema_version" smallint NOT NULL,
	"request_ip" text,
	"request_user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "pk_file_signatures" PRIMARY KEY("file_piece_cid","signer")
);
--> statement-breakpoint
CREATE TABLE "file_signer_amendments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"file_piece_cid" text NOT NULL,
	"old_commitment" text NOT NULL,
	"new_commitment" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"pending_new_signer_json" jsonb,
	"propose_tx_hash" text NOT NULL,
	"execute_tx_hash" text,
	"cancel_tx_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_signer_drafts" (
	"file_piece_cid" text NOT NULL,
	"wallet" text NOT NULL,
	"completed_field_ids" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "pk_file_signer_drafts" PRIMARY KEY("file_piece_cid","wallet")
);
--> statement-breakpoint
CREATE TABLE "files" (
	"piece_cid" text PRIMARY KEY NOT NULL,
	"sender" text NOT NULL,
	"created_by_wallet" text NOT NULL,
	"organization_id" uuid NOT NULL,
	"org_kem_ciphertext" text NOT NULL,
	"org_encrypted_encryption_key" text NOT NULL,
	"status" text DEFAULT 's3' NOT NULL,
	"onchain_tx_hash" text NOT NULL,
	"registry_address" text NOT NULL,
	"placement_commitment" text NOT NULL,
	"document_sha256" text NOT NULL,
	"placement_manifest_json" jsonb NOT NULL,
	"register_routing_json" jsonb,
	"warm_participant_count" integer DEFAULT 0 NOT NULL,
	"cold_invite_count" integer DEFAULT 0 NOT NULL,
	"signer_slot_count" integer DEFAULT 0 NOT NULL,
	"recipient_slot_count" integer DEFAULT 0 NOT NULL,
	"display_name" text,
	"mime_type" text,
	"ciphertext_byte_length" integer,
	"revoked_before_completed_at" timestamp with time zone,
	"revoked_by" text,
	"completed_at" timestamp with time zone,
	"revoke_onchain_tx_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "files_onchainTxHash_unique" UNIQUE("onchain_tx_hash")
);
--> statement-breakpoint
CREATE TABLE "attachment_release_rules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"packet_row_id" uuid NOT NULL,
	"file_piece_cid" text NOT NULL,
	"on_chain_rule_id" bigint NOT NULL,
	"release_contract_address" text NOT NULL,
	"packet_content_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "envelope_attachment_packet_cold_wraps" (
	"id" uuid PRIMARY KEY NOT NULL,
	"packet_row_id" uuid NOT NULL,
	"email" text NOT NULL,
	"wrapped_packet_dek" text NOT NULL,
	"invite_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "envelope_attachment_packet_recipients" (
	"id" uuid PRIMARY KEY NOT NULL,
	"packet_row_id" uuid NOT NULL,
	"email" text NOT NULL,
	"email_commitment" text NOT NULL,
	"wallet" text,
	"delivery_kind" text NOT NULL,
	"kem_ciphertext" text,
	"encrypted_packet_dek" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "envelope_attachment_packets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"file_piece_cid" text NOT NULL,
	"packet_id" text NOT NULL,
	"packet_cid" text NOT NULL,
	"label" text,
	"release_mode" text NOT NULL,
	"release_type" text,
	"release_params" jsonb,
	"recipients_commitment" text,
	"on_chain_rule_id" bigint,
	"release_contract_address" text,
	"register_rule_tx_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "foc_objects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"piece_cid" text NOT NULL,
	"r2_key" text NOT NULL,
	"byte_length" integer DEFAULT 0 NOT NULL,
	"replicate_status" text DEFAULT 'pending' NOT NULL,
	"deal_id" text,
	"retention_until" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"r2_evict_after" timestamp with time zone NOT NULL,
	"r2_evicted_at" timestamp with time zone,
	"foc_verified_at" timestamp with time zone,
	"lifecycle" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "file_settlement_recipient_acks" (
	"file_piece_cid" text NOT NULL,
	"signer_wallet" text NOT NULL,
	"terms_version" text NOT NULL,
	"acknowledged_at" timestamp with time zone NOT NULL,
	"request_ip" text,
	"request_user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "pk_file_settlement_recipient_acks" PRIMARY KEY("file_piece_cid","signer_wallet")
);
--> statement-breakpoint
CREATE TABLE "organization_settlement_feature_access" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"terms_version" text NOT NULL,
	"accepted_at" timestamp with time zone NOT NULL,
	"accepted_by_wallet" text NOT NULL,
	"use_case" text,
	"sanctions_self_cert_at" timestamp with time zone NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by_admin_wallet" text,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "organization_archival" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"status" text DEFAULT 'none' NOT NULL,
	"retention_until" timestamp with time zone,
	"export_grace_until" timestamp with time zone,
	"dodo_subscription_id" text,
	"dodo_customer_id" text,
	"purchased_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "organization_archival_dodoSubscriptionId_unique" UNIQUE("dodo_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "organization_connections" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"recipient_wallet" text NOT NULL,
	"label" text,
	"added_by_wallet" text NOT NULL,
	"anchor_sender_wallet" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "organization_invites" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'sender' NOT NULL,
	"token" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"claimed_at" timestamp with time zone,
	"claimed_by_wallet" text,
	"expires_at" timestamp with time zone NOT NULL,
	"invited_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "organization_member_keys" (
	"organization_id" uuid NOT NULL,
	"wallet_address" text NOT NULL,
	"wrapped_omk" text NOT NULL,
	"wrap_kem_ciphertext" text NOT NULL,
	"wrapped_by_wallet" text NOT NULL,
	"version" smallint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "pk_organization_member_keys" PRIMARY KEY("organization_id","wallet_address")
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"organization_id" uuid NOT NULL,
	"wallet_address" text NOT NULL,
	"role" text DEFAULT 'sender' NOT NULL,
	"status" text DEFAULT 'invited' NOT NULL,
	"invited_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "pk_organization_members" PRIMARY KEY("organization_id","wallet_address")
);
--> statement-breakpoint
CREATE TABLE "organization_subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"plan_id" text DEFAULT 'free' NOT NULL,
	"seat_count" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"provider" text DEFAULT 'manual' NOT NULL,
	"billing_interval" text,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"feature_overrides" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"period_start" timestamp with time zone DEFAULT now() NOT NULL,
	"period_end" timestamp with time zone,
	"dodo_customer_id" text,
	"dodo_subscription_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "organization_subscriptions_organizationId_unique" UNIQUE("organization_id"),
	CONSTRAINT "organization_subscriptions_dodoSubscriptionId_unique" UNIQUE("dodo_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "organization_templates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"s3_key" text NOT NULL,
	"dek_wrapped_omk" text NOT NULL,
	"placement_manifest_json" jsonb NOT NULL,
	"created_by_wallet" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"encryption_public_key" text NOT NULL,
	"created_by_wallet" text NOT NULL,
	"signing_mode" text DEFAULT 'acting_member' NOT NULL,
	"org_wallet_address" text,
	"org_wallet_linked_at" timestamp with time zone,
	"is_personal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "access_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"company" text,
	"message" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by_admin_wallet" text,
	"created_invite_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"actor_wallet" text,
	"organization_id" uuid,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"metadata_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_webhook_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"provider" text DEFAULT 'dodo' NOT NULL,
	"provider_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"status" text DEFAULT 'processed' NOT NULL,
	"delivery_timestamp" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"last_error" text,
	"payload_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "billing_webhook_events_providerEventId_unique" UNIQUE("provider_event_id")
);
--> statement-breakpoint
CREATE TABLE "checkout_intents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"continue_token" text NOT NULL,
	"setup_token" text NOT NULL,
	"email" text NOT NULL,
	"plan_id" text NOT NULL,
	"billing_interval" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"dodo_session_id" text,
	"seat_count" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "checkout_intents_continueToken_unique" UNIQUE("continue_token"),
	CONSTRAINT "checkout_intents_setupToken_unique" UNIQUE("setup_token")
);
--> statement-breakpoint
CREATE TABLE "file_settlement_rules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"piece_cid" text NOT NULL,
	"on_chain_rule_id" bigint NOT NULL,
	"cid_identifier" text NOT NULL,
	"payer_wallet" text NOT NULL,
	"token_address" text NOT NULL,
	"legs" jsonb NOT NULL,
	"expires_at" numeric(78, 0),
	"release_type" text NOT NULL,
	"release_params" jsonb NOT NULL,
	"validator_address" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"register_rule_tx_hash" text NOT NULL,
	"approve_tx_hash" text NOT NULL,
	"update_rule_tx_hash" text,
	"cancel_rule_tx_hash" text,
	"payout_tx_hash" text,
	"last_error" text,
	"executed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
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
CREATE TABLE "platform_access_pending" (
	"id" uuid PRIMARY KEY NOT NULL,
	"setup_token" text NOT NULL,
	"email" text NOT NULL,
	"plan_id" text NOT NULL,
	"dodo_subscription_id" text,
	"dodo_customer_id" text,
	"seat_count" integer DEFAULT 1 NOT NULL,
	"billing_interval" text,
	"status" text DEFAULT 'pending_wallet' NOT NULL,
	"linked_wallet" text,
	"linked_organization_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "platform_access_pending_setupToken_unique" UNIQUE("setup_token"),
	CONSTRAINT "platform_access_pending_dodoSubscriptionId_unique" UNIQUE("dodo_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "platform_invite_redemptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"invite_id" uuid NOT NULL,
	"wallet_address" text NOT NULL,
	"email" text NOT NULL,
	"redeemed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_invites" (
	"id" uuid PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"kind" text NOT NULL,
	"email" text,
	"plan_id" text DEFAULT 'teams_pro' NOT NULL,
	"trial_days" integer DEFAULT 30 NOT NULL,
	"feature_overrides" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"max_redemptions" integer DEFAULT 1 NOT NULL,
	"redemption_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_by_admin_wallet" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "platform_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"wallet_address" text NOT NULL,
	"field_name" text NOT NULL,
	"old_value" text NOT NULL,
	"new_value" text NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_invites" (
	"id" uuid PRIMARY KEY NOT NULL,
	"sender" text NOT NULL,
	"invitee_email" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"claimed_at" timestamp with time zone,
	"claimed_by_wallet" text,
	"message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_signatures" (
	"id" uuid PRIMARY KEY NOT NULL,
	"wallet_address" text NOT NULL,
	"data" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"wallet_address" text NOT NULL,
	"plan_id" text DEFAULT 'free' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"provider" text DEFAULT 'manual' NOT NULL,
	"period_start" timestamp with time zone DEFAULT now() NOT NULL,
	"period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"feature_overrides" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"dodo_customer_id" text,
	"dodo_subscription_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "user_subscriptions_walletAddress_unique" UNIQUE("wallet_address"),
	CONSTRAINT "user_subscriptions_dodoSubscriptionId_unique" UNIQUE("dodo_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"wallet_address" text PRIMARY KEY NOT NULL,
	"keygen_data_json" jsonb,
	"encryption_public_key" text NOT NULL,
	"signature_public_key" text NOT NULL,
	"auth_provider_id" text NOT NULL,
	"email" text NOT NULL,
	"mobile" text,
	"username" text,
	"first_name" text,
	"last_name" text,
	"avatar_key" text,
	"invited_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_authProviderId_unique" UNIQUE("auth_provider_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "users_datasets" (
	"wallet_address" text PRIMARY KEY NOT NULL,
	"data_set_id" integer NOT NULL,
	"provider_address" text NOT NULL,
	"total_deposited_base_units" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "analytics_consent_receipts" ADD CONSTRAINT "analytics_consent_receipts_wallet_address_users_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_erasure_ledger" ADD CONSTRAINT "privacy_erasure_ledger_subject_wallet_address_users_wallet_address_fk" FOREIGN KEY ("subject_wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_requests" ADD CONSTRAINT "privacy_requests_subject_wallet_address_users_wallet_address_fk" FOREIGN KEY ("subject_wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_requests" ADD CONSTRAINT "privacy_requests_assignee_wallet_address_users_wallet_address_fk" FOREIGN KEY ("assignee_wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_comments" ADD CONSTRAINT "draft_comments_draft_id_envelope_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."envelope_drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_comments" ADD CONSTRAINT "draft_comments_author_wallet_users_wallet_address_fk" FOREIGN KEY ("author_wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_external_shares" ADD CONSTRAINT "draft_external_shares_draft_id_envelope_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."envelope_drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_external_shares" ADD CONSTRAINT "draft_external_shares_created_by_wallet_users_wallet_address_fk" FOREIGN KEY ("created_by_wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envelope_draft_documents" ADD CONSTRAINT "envelope_draft_documents_draft_id_envelope_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."envelope_drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envelope_drafts" ADD CONSTRAINT "envelope_drafts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envelope_drafts" ADD CONSTRAINT "envelope_drafts_created_by_wallet_users_wallet_address_fk" FOREIGN KEY ("created_by_wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_export_logs" ADD CONSTRAINT "compliance_export_logs_file_piece_cid_files_piece_cid_fk" FOREIGN KEY ("file_piece_cid") REFERENCES "public"."files"("piece_cid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_acknowledgements" ADD CONSTRAINT "file_acknowledgements_file_piece_cid_files_piece_cid_fk" FOREIGN KEY ("file_piece_cid") REFERENCES "public"."files"("piece_cid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_acknowledgements" ADD CONSTRAINT "file_acknowledgements_wallet_users_wallet_address_fk" FOREIGN KEY ("wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_cold_invites" ADD CONSTRAINT "file_cold_invites_file_piece_cid_files_piece_cid_fk" FOREIGN KEY ("file_piece_cid") REFERENCES "public"."files"("piece_cid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_cold_invites" ADD CONSTRAINT "file_cold_invites_claimed_by_wallet_users_wallet_address_fk" FOREIGN KEY ("claimed_by_wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_comments" ADD CONSTRAINT "file_comments_file_piece_cid_files_piece_cid_fk" FOREIGN KEY ("file_piece_cid") REFERENCES "public"."files"("piece_cid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_comments" ADD CONSTRAINT "file_comments_author_wallet_users_wallet_address_fk" FOREIGN KEY ("author_wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_document_views" ADD CONSTRAINT "file_document_views_file_piece_cid_files_piece_cid_fk" FOREIGN KEY ("file_piece_cid") REFERENCES "public"."files"("piece_cid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_document_views" ADD CONSTRAINT "file_document_views_wallet_users_wallet_address_fk" FOREIGN KEY ("wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_participants" ADD CONSTRAINT "file_participants_file_piece_cid_files_piece_cid_fk" FOREIGN KEY ("file_piece_cid") REFERENCES "public"."files"("piece_cid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_participants" ADD CONSTRAINT "file_participants_wallet_users_wallet_address_fk" FOREIGN KEY ("wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_signatures" ADD CONSTRAINT "file_signatures_file_piece_cid_files_piece_cid_fk" FOREIGN KEY ("file_piece_cid") REFERENCES "public"."files"("piece_cid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_signer_amendments" ADD CONSTRAINT "file_signer_amendments_file_piece_cid_files_piece_cid_fk" FOREIGN KEY ("file_piece_cid") REFERENCES "public"."files"("piece_cid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_signer_drafts" ADD CONSTRAINT "file_signer_drafts_file_piece_cid_files_piece_cid_fk" FOREIGN KEY ("file_piece_cid") REFERENCES "public"."files"("piece_cid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_signer_drafts" ADD CONSTRAINT "file_signer_drafts_wallet_users_wallet_address_fk" FOREIGN KEY ("wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_sender_users_wallet_address_fk" FOREIGN KEY ("sender") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_created_by_wallet_users_wallet_address_fk" FOREIGN KEY ("created_by_wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment_release_rules" ADD CONSTRAINT "attachment_release_rules_packet_row_id_envelope_attachment_packets_id_fk" FOREIGN KEY ("packet_row_id") REFERENCES "public"."envelope_attachment_packets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envelope_attachment_packet_cold_wraps" ADD CONSTRAINT "envelope_attachment_packet_cold_wraps_packet_row_id_envelope_attachment_packets_id_fk" FOREIGN KEY ("packet_row_id") REFERENCES "public"."envelope_attachment_packets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envelope_attachment_packet_recipients" ADD CONSTRAINT "envelope_attachment_packet_recipients_packet_row_id_envelope_attachment_packets_id_fk" FOREIGN KEY ("packet_row_id") REFERENCES "public"."envelope_attachment_packets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envelope_attachment_packets" ADD CONSTRAINT "envelope_attachment_packets_file_piece_cid_files_piece_cid_fk" FOREIGN KEY ("file_piece_cid") REFERENCES "public"."files"("piece_cid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foc_objects" ADD CONSTRAINT "foc_objects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foc_objects" ADD CONSTRAINT "foc_objects_piece_cid_files_piece_cid_fk" FOREIGN KEY ("piece_cid") REFERENCES "public"."files"("piece_cid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_settlement_recipient_acks" ADD CONSTRAINT "file_settlement_recipient_acks_file_piece_cid_files_piece_cid_fk" FOREIGN KEY ("file_piece_cid") REFERENCES "public"."files"("piece_cid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_settlement_recipient_acks" ADD CONSTRAINT "file_settlement_recipient_acks_signer_wallet_users_wallet_address_fk" FOREIGN KEY ("signer_wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_settlement_feature_access" ADD CONSTRAINT "organization_settlement_feature_access_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_settlement_feature_access" ADD CONSTRAINT "organization_settlement_feature_access_accepted_by_wallet_users_wallet_address_fk" FOREIGN KEY ("accepted_by_wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_archival" ADD CONSTRAINT "organization_archival_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_connections" ADD CONSTRAINT "organization_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_connections" ADD CONSTRAINT "organization_connections_recipient_wallet_users_wallet_address_fk" FOREIGN KEY ("recipient_wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_connections" ADD CONSTRAINT "organization_connections_added_by_wallet_users_wallet_address_fk" FOREIGN KEY ("added_by_wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_connections" ADD CONSTRAINT "organization_connections_anchor_sender_wallet_users_wallet_address_fk" FOREIGN KEY ("anchor_sender_wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invites" ADD CONSTRAINT "organization_invites_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invites" ADD CONSTRAINT "organization_invites_claimed_by_wallet_users_wallet_address_fk" FOREIGN KEY ("claimed_by_wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invites" ADD CONSTRAINT "organization_invites_invited_by_users_wallet_address_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_member_keys" ADD CONSTRAINT "organization_member_keys_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_member_keys" ADD CONSTRAINT "organization_member_keys_wallet_address_users_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_member_keys" ADD CONSTRAINT "organization_member_keys_wrapped_by_wallet_users_wallet_address_fk" FOREIGN KEY ("wrapped_by_wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_wallet_address_users_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_invited_by_users_wallet_address_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "organization_subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_templates" ADD CONSTRAINT "organization_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_templates" ADD CONSTRAINT "organization_templates_created_by_wallet_users_wallet_address_fk" FOREIGN KEY ("created_by_wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_created_by_wallet_users_wallet_address_fk" FOREIGN KEY ("created_by_wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_created_invite_id_platform_invites_id_fk" FOREIGN KEY ("created_invite_id") REFERENCES "public"."platform_invites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_wallet_users_wallet_address_fk" FOREIGN KEY ("actor_wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_settlement_rules" ADD CONSTRAINT "file_settlement_rules_piece_cid_files_piece_cid_fk" FOREIGN KEY ("piece_cid") REFERENCES "public"."files"("piece_cid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_access_pending" ADD CONSTRAINT "platform_access_pending_linked_wallet_users_wallet_address_fk" FOREIGN KEY ("linked_wallet") REFERENCES "public"."users"("wallet_address") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_access_pending" ADD CONSTRAINT "platform_access_pending_linked_organization_id_organizations_id_fk" FOREIGN KEY ("linked_organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_invite_redemptions" ADD CONSTRAINT "platform_invite_redemptions_invite_id_platform_invites_id_fk" FOREIGN KEY ("invite_id") REFERENCES "public"."platform_invites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_invite_redemptions" ADD CONSTRAINT "platform_invite_redemptions_wallet_address_users_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_history" ADD CONSTRAINT "user_history_wallet_address_users_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invites" ADD CONSTRAINT "user_invites_sender_users_wallet_address_fk" FOREIGN KEY ("sender") REFERENCES "public"."users"("wallet_address") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invites" ADD CONSTRAINT "user_invites_claimed_by_wallet_users_wallet_address_fk" FOREIGN KEY ("claimed_by_wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_signatures" ADD CONSTRAINT "user_signatures_wallet_address_users_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_wallet_address_users_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_datasets" ADD CONSTRAINT "users_datasets_wallet_address_users_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_analytics_consent_wallet_created" ON "analytics_consent_receipts" USING btree ("wallet_address","created_at");--> statement-breakpoint
CREATE INDEX "idx_privacy_erasure_ledger_subject_executed" ON "privacy_erasure_ledger" USING btree ("subject_wallet_address","executed_at");--> statement-breakpoint
CREATE INDEX "idx_privacy_erasure_ledger_replay_required" ON "privacy_erasure_ledger" USING btree ("replay_required");--> statement-breakpoint
CREATE INDEX "idx_privacy_requests_subject_created" ON "privacy_requests" USING btree ("subject_wallet_address","created_at");--> statement-breakpoint
CREATE INDEX "idx_privacy_requests_status" ON "privacy_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_draft_comments_draft" ON "draft_comments" USING btree ("draft_id");--> statement-breakpoint
CREATE INDEX "idx_draft_comments_draft_created" ON "draft_comments" USING btree ("draft_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_draft_external_shares_draft" ON "draft_external_shares" USING btree ("draft_id");--> statement-breakpoint
CREATE INDEX "idx_draft_external_shares_token" ON "draft_external_shares" USING btree ("invite_token");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_envelope_draft_documents_draft_doc" ON "envelope_draft_documents" USING btree ("draft_id","doc_id");--> statement-breakpoint
CREATE INDEX "idx_envelope_draft_documents_draft" ON "envelope_draft_documents" USING btree ("draft_id");--> statement-breakpoint
CREATE INDEX "idx_envelope_drafts_org" ON "envelope_drafts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_envelope_drafts_creator" ON "envelope_drafts" USING btree ("created_by_wallet");--> statement-breakpoint
CREATE INDEX "idx_envelope_drafts_org_status" ON "envelope_drafts" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_compliance_export_file_created" ON "compliance_export_logs" USING btree ("file_piece_cid","created_at");--> statement-breakpoint
CREATE INDEX "idx_compliance_export_requester" ON "compliance_export_logs" USING btree ("requested_by");--> statement-breakpoint
CREATE INDEX "idx_acknowledgements_file" ON "file_acknowledgements" USING btree ("file_piece_cid");--> statement-breakpoint
CREATE INDEX "idx_acknowledgements_wallet" ON "file_acknowledgements" USING btree ("wallet");--> statement-breakpoint
CREATE INDEX "idx_file_cold_invites_piece" ON "file_cold_invites" USING btree ("file_piece_cid");--> statement-breakpoint
CREATE INDEX "idx_file_cold_invites_piece_email_commitment" ON "file_cold_invites" USING btree ("file_piece_cid","email_commitment");--> statement-breakpoint
CREATE INDEX "idx_file_cold_invites_token" ON "file_cold_invites" USING btree ("invite_token");--> statement-breakpoint
CREATE INDEX "idx_file_cold_invites_email" ON "file_cold_invites" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_file_cold_invites_expires" ON "file_cold_invites" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_file_cold_invites_piece_status" ON "file_cold_invites" USING btree ("file_piece_cid","status");--> statement-breakpoint
CREATE INDEX "idx_file_cold_invites_status_expires" ON "file_cold_invites" USING btree ("status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_file_cold_invites_pending_token_email" ON "file_cold_invites" USING btree ("invite_token","email") WHERE "file_cold_invites"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "idx_file_comments_piece" ON "file_comments" USING btree ("file_piece_cid");--> statement-breakpoint
CREATE INDEX "idx_file_comments_piece_created" ON "file_comments" USING btree ("file_piece_cid","created_at");--> statement-breakpoint
CREATE INDEX "idx_document_views_file" ON "file_document_views" USING btree ("file_piece_cid");--> statement-breakpoint
CREATE INDEX "idx_document_views_wallet" ON "file_document_views" USING btree ("wallet");--> statement-breakpoint
CREATE INDEX "idx_participants_wallet" ON "file_participants" USING btree ("wallet");--> statement-breakpoint
CREATE INDEX "idx_participants_file" ON "file_participants" USING btree ("file_piece_cid");--> statement-breakpoint
CREATE INDEX "idx_participants_file_email_commitment" ON "file_participants" USING btree ("file_piece_cid","email_commitment");--> statement-breakpoint
CREATE INDEX "idx_signatures_file" ON "file_signatures" USING btree ("file_piece_cid");--> statement-breakpoint
CREATE INDEX "idx_file_signer_amendments_piece" ON "file_signer_amendments" USING btree ("file_piece_cid");--> statement-breakpoint
CREATE INDEX "idx_file_signer_amendments_piece_status" ON "file_signer_amendments" USING btree ("file_piece_cid","status");--> statement-breakpoint
CREATE INDEX "idx_signer_drafts_wallet" ON "file_signer_drafts" USING btree ("wallet");--> statement-breakpoint
CREATE INDEX "idx_files_owner" ON "files" USING btree ("sender");--> statement-breakpoint
CREATE INDEX "idx_files_sender_created" ON "files" USING btree ("sender","created_at");--> statement-breakpoint
CREATE INDEX "idx_files_organization" ON "files" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_files_registry_address" ON "files" USING btree ("registry_address");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_attachment_release_rules_validator_rule" ON "attachment_release_rules" USING btree ("release_contract_address","on_chain_rule_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_attachment_packet_cold_wrap" ON "envelope_attachment_packet_cold_wraps" USING btree ("packet_row_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_attachment_packet_recipient" ON "envelope_attachment_packet_recipients" USING btree ("packet_row_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_attachment_packets_piece_packet" ON "envelope_attachment_packets" USING btree ("file_piece_cid","packet_id");--> statement-breakpoint
CREATE INDEX "idx_attachment_packets_piece" ON "envelope_attachment_packets" USING btree ("file_piece_cid");--> statement-breakpoint
CREATE INDEX "idx_foc_objects_org_lifecycle" ON "foc_objects" USING btree ("organization_id","lifecycle");--> statement-breakpoint
CREATE INDEX "idx_foc_objects_transition_due" ON "foc_objects" USING btree ("replicate_status","r2_evict_after");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_foc_objects_piece_cid" ON "foc_objects" USING btree ("piece_cid");--> statement-breakpoint
CREATE INDEX "idx_settlement_recipient_acks_piece" ON "file_settlement_recipient_acks" USING btree ("file_piece_cid");--> statement-breakpoint
CREATE INDEX "idx_org_settlement_access_status" ON "organization_settlement_feature_access" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_org_settlement_access_accepted_by" ON "organization_settlement_feature_access" USING btree ("accepted_by_wallet");--> statement-breakpoint
CREATE INDEX "idx_organization_archival_status" ON "organization_archival" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_organization_archival_export_grace" ON "organization_archival" USING btree ("export_grace_until");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_org_connections_org_recipient" ON "organization_connections" USING btree ("organization_id","recipient_wallet");--> statement-breakpoint
CREATE INDEX "idx_org_connections_org_status" ON "organization_connections" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_org_invites_org" ON "organization_invites" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_org_invites_email" ON "organization_invites" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_org_invites_status_expires" ON "organization_invites" USING btree ("status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_org_invites_pending_token" ON "organization_invites" USING btree ("token") WHERE "organization_invites"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "idx_org_members_wallet" ON "organization_members" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "idx_org_subscriptions_plan" ON "organization_subscriptions" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "idx_org_subscriptions_dodo_customer" ON "organization_subscriptions" USING btree ("dodo_customer_id");--> statement-breakpoint
CREATE INDEX "idx_org_templates_org" ON "organization_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_organizations_created_by" ON "organizations" USING btree ("created_by_wallet");--> statement-breakpoint
CREATE INDEX "idx_organizations_personal_owner" ON "organizations" USING btree ("created_by_wallet","is_personal");--> statement-breakpoint
CREATE INDEX "idx_access_requests_email" ON "access_requests" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_access_requests_status" ON "access_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_audit_events_actor_created" ON "audit_events" USING btree ("actor_wallet","created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_events_org_created" ON "audit_events" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_events_action_created" ON "audit_events" USING btree ("action","created_at");--> statement-breakpoint
CREATE INDEX "idx_billing_webhook_events_provider_event" ON "billing_webhook_events" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "idx_billing_webhook_events_event_type" ON "billing_webhook_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_checkout_intents_email" ON "checkout_intents" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_checkout_intents_status" ON "checkout_intents" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_file_settlement_rules_validator_rule" ON "file_settlement_rules" USING btree ("validator_address","on_chain_rule_id");--> statement-breakpoint
CREATE INDEX "idx_file_settlement_rules_piece" ON "file_settlement_rules" USING btree ("piece_cid");--> statement-breakpoint
CREATE INDEX "idx_file_settlement_rules_status" ON "file_settlement_rules" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_file_settlement_rules_validator" ON "file_settlement_rules" USING btree ("validator_address");--> statement-breakpoint
CREATE INDEX "idx_job_outbox_unprocessed" ON "job_outbox" USING btree ("processed_at","created_at");--> statement-breakpoint
CREATE INDEX "idx_job_outbox_processed_at" ON "job_outbox" USING btree ("processed_at");--> statement-breakpoint
CREATE INDEX "idx_platform_access_pending_email" ON "platform_access_pending" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_platform_access_pending_status" ON "platform_access_pending" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_platform_invite_redemptions_invite_wallet" ON "platform_invite_redemptions" USING btree ("invite_id","wallet_address");--> statement-breakpoint
CREATE INDEX "idx_platform_invite_redemptions_wallet" ON "platform_invite_redemptions" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "idx_platform_invites_token" ON "platform_invites" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_platform_invites_revoked" ON "platform_invites" USING btree ("revoked_at");--> statement-breakpoint
CREATE INDEX "idx_user_invites_status_expires" ON "user_invites" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "idx_user_subscriptions_plan" ON "user_subscriptions" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "idx_user_subscriptions_status" ON "user_subscriptions" USING btree ("status");