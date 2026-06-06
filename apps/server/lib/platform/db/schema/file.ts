import type {
	FieldCompletionMap,
	FieldValueKind,
	PlacementManifest,
	RegisterRoutingInput,
} from "@filosign/shared";
import { sql } from "drizzle-orm";
import * as t from "drizzle-orm/pg-core";
import {
	tBytes32,
	tEvmAddress,
	tHex,
	timestamps,
} from "@/lib/platform/db/helpers";
import { randomUuidV7 } from "@/lib/platform/db/random-uuid-v7";
import { organizations } from "./organization";
import { userSignatures, users } from "./user";

export const coldInviteStatuses = [
	"pending",
	"claimed",
	"expired",
	"revoked",
] as const;

export type ColdInviteStatus = (typeof coldInviteStatuses)[number];

export const files = t.pgTable(
	"files",
	{
		pieceCid: t.text().notNull().primaryKey(),
		sender: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress),
		createdByWallet: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress),
		organizationId: t
			.uuid()
			.notNull()
			.references(() => organizations.id, { onDelete: "restrict" }),
		orgKemCiphertext: tHex().notNull(),
		orgEncryptedEncryptionKey: tHex().notNull(),

		status: t
			.text({ enum: ["s3"] })
			.notNull()
			.default("s3"),
		onchainTxHash: tBytes32().unique().notNull(),
		registryAddress: tEvmAddress().notNull(),

		placementCommitment: tBytes32().notNull(),
		/** Merkle root of per-document SHA-256 leaves (sender-signed at register). */
		documentSha256: tBytes32().notNull(),
		placementManifestJson: t.jsonb().$type<PlacementManifest>().notNull(),
		/** Snapshot of register routing for sign UX (sequential order, quorum). */
		registerRoutingJson: t.jsonb().$type<RegisterRoutingInput>(),

		warmParticipantCount: t.integer().notNull().default(0),
		coldInviteCount: t.integer().notNull().default(0),
		signerSlotCount: t.integer().notNull().default(0),
		recipientSlotCount: t.integer().notNull().default(0),

		displayName: t.text(),
		mimeType: t.text(),
		ciphertextByteLength: t.integer(),
		/** Attested void time from chain (EIP-712 timestamp on recallEnvelope). */
		revokedBeforeCompletedAt: t.timestamp({ withTimezone: true }),
		revokedBy: tEvmAddress(),
		/** Set when envelope routing completes on-chain (completedAt). */
		completedAt: t.timestamp({ withTimezone: true }),
		revokeOnchainTxHash: tBytes32(),
		/** Practice/tutorial envelope — excluded from send quota and first-send metrics. */
		isPractice: t.boolean().notNull().default(false),

		...timestamps,
	},
	(table) => [
		t.index("idx_files_owner").on(table.sender),
		t.index("idx_files_sender_created").on(table.sender, table.createdAt),
		t.index("idx_files_organization").on(table.organizationId),
		t.index("idx_files_registry_address").on(table.registryAddress),
	],
);

export const fileParticipants = t.pgTable(
	"file_participants",
	{
		filePieceCid: t
			.text()
			.notNull()
			.references(() => files.pieceCid, { onDelete: "cascade" }),
		wallet: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress),

		role: t.text({ enum: ["sender", "viewer", "signer"] }).notNull(),

		emailCommitment: tBytes32(),

		kemCiphertext: tHex().notNull(),
		encryptedEncryptionKey: tHex().notNull(),

		...timestamps,
	},
	(table) => [
		t.primaryKey({
			columns: [table.filePieceCid, table.wallet],
			name: "pk_file_participants",
		}),
		t.index("idx_participants_wallet").on(table.wallet),
		t.index("idx_participants_file").on(table.filePieceCid),
		t
			.index("idx_participants_file_email_commitment")
			.on(table.filePieceCid, table.emailCommitment),
	],
);

export const fileColdInvites = t.pgTable(
	"file_cold_invites",
	{
		id: t.uuid().primaryKey().$defaultFn(randomUuidV7),
		inviteToken: t.text(),
		filePieceCid: t
			.text()
			.notNull()
			.references(() => files.pieceCid, { onDelete: "cascade" }),
		email: t.text().notNull(),
		emailCommitment: tBytes32().notNull(),
		wrappedEncryptionKey: tHex(),
		isSigner: t.boolean().notNull().default(false),
		status: t.text({ enum: coldInviteStatuses }).notNull().default("pending"),
		claimedAt: t.timestamp({ withTimezone: true }),
		claimedByWallet: tEvmAddress().references(() => users.walletAddress),
		expiresAt: t.timestamp({ withTimezone: true }).notNull(),
		...timestamps,
	},
	(table) => [
		t.index("idx_file_cold_invites_piece").on(table.filePieceCid),
		t
			.index("idx_file_cold_invites_piece_email_commitment")
			.on(table.filePieceCid, table.emailCommitment),
		t.index("idx_file_cold_invites_token").on(table.inviteToken),
		t.index("idx_file_cold_invites_email").on(table.email),
		t.index("idx_file_cold_invites_expires").on(table.expiresAt),
		t
			.index("idx_file_cold_invites_piece_status")
			.on(table.filePieceCid, table.status),
		t
			.index("idx_file_cold_invites_status_expires")
			.on(table.status, table.expiresAt),
		t
			.uniqueIndex("uidx_file_cold_invites_pending_token_email")
			.on(table.inviteToken, table.email)
			.where(sql`${table.status} = 'pending'`),
	],
);

export const documentViewSources = [
	"sign_page",
	"file_viewer",
	"inbox",
] as const;

export type DocumentViewSource = (typeof documentViewSources)[number];

export const fileAcknowledgements = t.pgTable(
	"file_acknowledgements",
	{
		filePieceCid: t
			.text()
			.notNull()
			.references(() => files.pieceCid, { onDelete: "cascade" }),
		wallet: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress),
		ack: tHex().notNull(),
		acknowledgedAt: t.timestamp({ withTimezone: true }).notNull(),
		intentVersion: t.text().notNull(),
		requestIp: t.text(),
		requestUserAgent: t.text(),

		...timestamps,
	},
	(table) => [
		t.primaryKey({
			columns: [table.filePieceCid, table.wallet],
			name: "pk_file_acknowledgements",
		}),
		t.index("idx_acknowledgements_file").on(table.filePieceCid),
		t.index("idx_acknowledgements_wallet").on(table.wallet),
	],
);

export const fileDocumentViews = t.pgTable(
	"file_document_views",
	{
		filePieceCid: t
			.text()
			.notNull()
			.references(() => files.pieceCid, { onDelete: "cascade" }),
		wallet: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress),
		firstViewedAt: t.timestamp({ withTimezone: true }).notNull(),
		source: t.text({ enum: documentViewSources }).notNull(),
		...timestamps,
	},
	(table) => [
		t.primaryKey({
			columns: [table.filePieceCid, table.wallet],
			name: "pk_file_document_views",
		}),
		t.index("idx_document_views_file").on(table.filePieceCid),
		t.index("idx_document_views_wallet").on(table.wallet),
	],
);

/** Per-signer completed field ids for draft/resume (Merkle leaf set before final sign). */
export const fileSignerDrafts = t.pgTable(
	"file_signer_drafts",
	{
		filePieceCid: t
			.text()
			.notNull()
			.references(() => files.pieceCid, { onDelete: "cascade" }),
		wallet: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress),
		completedFieldIds: t.jsonb().$type<string[]>().notNull(),
		fieldCompletions: t
			.jsonb()
			.$type<FieldCompletionMap>()
			.notNull()
			.default({}),
		...timestamps,
	},
	(table) => [
		t.primaryKey({
			columns: [table.filePieceCid, table.wallet],
			name: "pk_file_signer_drafts",
		}),
		t.index("idx_signer_drafts_wallet").on(table.wallet),
	],
);

export const fieldValueKinds = ["visual", "text", "checkbox", "auto"] as const;

/** Immutable per-envelope field visual/text snapshot at final sign. */
export const fileFieldCompletions = t.pgTable(
	"file_field_completions",
	{
		filePieceCid: t
			.text()
			.notNull()
			.references(() => files.pieceCid, { onDelete: "cascade" }),
		fieldId: t.text().notNull(),
		signer: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress),
		valueKind: t
			.text({ enum: fieldValueKinds })
			.$type<FieldValueKind>()
			.notNull(),
		sourceArtifactId: t
			.uuid()
			.references(() => userSignatures.id, { onDelete: "restrict" }),
		storageKey: t.text(),
		contentSha256: t.text(),
		textValue: t.text(),
		...timestamps,
	},
	(table) => [
		t.primaryKey({
			columns: [table.filePieceCid, table.fieldId],
			name: "pk_file_field_completions",
		}),
		t.index("idx_field_completions_piece").on(table.filePieceCid),
	],
);

export const fileComments = t.pgTable(
	"file_comments",
	{
		id: t.uuid().primaryKey().$defaultFn(randomUuidV7),
		filePieceCid: t
			.text()
			.notNull()
			.references(() => files.pieceCid, { onDelete: "cascade" }),
		authorWallet: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress),
		ciphertext: tHex().notNull(),
		...timestamps,
	},
	(table) => [
		t.index("idx_file_comments_piece").on(table.filePieceCid),
		t
			.index("idx_file_comments_piece_created")
			.on(table.filePieceCid, table.createdAt),
	],
);

export const fileSignatures = t.pgTable(
	"file_signatures",
	{
		filePieceCid: t
			.text()
			.notNull()
			.references(() => files.pieceCid, { onDelete: "cascade" }),
		signer: tEvmAddress().notNull(),
		evmSignature: tHex().notNull(),
		dl3Signature: tHex().notNull(),
		onchainTxHash: t.text().notNull(),
		/** Field IDs included in this signature’s completions Merkle tree (sorted in-tree). */
		completedFieldIds: t.jsonb().$type<string[]>().notNull(),
		completionsRoot: tBytes32().notNull(),
		leafSchemaVersion: t.smallint().notNull(),
		requestIp: t.text(),
		requestUserAgent: t.text(),
		...timestamps,
	},
	(table) => [
		t.primaryKey({
			columns: [table.filePieceCid, table.signer],
			name: "pk_file_signatures",
		}),
		t.index("idx_signatures_file").on(table.filePieceCid),
	],
);

/** Platform log: each compliance bundle generation for audit / future attestation. */
export const complianceExportLogs = t.pgTable(
	"compliance_export_logs",
	{
		id: t.uuid().primaryKey().$defaultFn(randomUuidV7),
		filePieceCid: t
			.text()
			.notNull()
			.references(() => files.pieceCid, { onDelete: "cascade" }),
		requestedBy: tEvmAddress().notNull(),
		bundleVersion: t.smallint().notNull(),
		bundleHash: t.text().notNull(),
		storageKey: t.text("storage_key").notNull(),
		executionStatus: t
			.text({ enum: ["fully_executed", "partially_executed"] })
			.notNull(),
		signaturesSnapshotCount: t.integer().notNull(),
		exportKind: t.text({ enum: ["zip", "pdf", "json"] }).notNull(),
		documentSha256: t.text(),
		requestUserAgent: t.text(),
		requestIp: t.text(),
		createdAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		t
			.index("idx_compliance_export_file_created")
			.on(table.filePieceCid, table.createdAt),
		t.index("idx_compliance_export_requester").on(table.requestedBy),
	],
);

export const signerAmendmentStatuses = [
	"pending",
	"executed",
	"cancelled",
] as const;

export type SignerAmendmentStatus = (typeof signerAmendmentStatuses)[number];

export type PendingNewSignerJson =
	| {
			kind: "warm";
			wallet: `0x${string}`;
			kemCiphertext: `0x${string}`;
			encryptedEncryptionKey: `0x${string}`;
	  }
	| {
			kind: "cold";
			email: string;
			inviteToken: string;
			wrappedEncryptionKey: `0x${string}`;
	  };

export const fileSignerAmendments = t.pgTable(
	"file_signer_amendments",
	{
		id: t
			.uuid()
			.primaryKey()
			.$defaultFn(() => randomUuidV7()),
		filePieceCid: t
			.text()
			.notNull()
			.references(() => files.pieceCid, { onDelete: "cascade" }),
		oldCommitment: tBytes32().notNull(),
		newCommitment: tBytes32().notNull(),
		status: t
			.text({ enum: signerAmendmentStatuses })
			.notNull()
			.default("pending"),
		pendingNewSignerJson: t.jsonb().$type<PendingNewSignerJson>(),
		proposeTxHash: tBytes32().notNull(),
		executeTxHash: tBytes32(),
		cancelTxHash: tBytes32(),
		createdAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		t.index("idx_file_signer_amendments_piece").on(table.filePieceCid),
		t
			.index("idx_file_signer_amendments_piece_status")
			.on(table.filePieceCid, table.status),
	],
);
