import type { PlacementManifest } from "@filosign/shared";
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
import { users } from "./user";

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
			.references(() => organizations.id, { onDelete: "set null" }),
		orgKemCiphertext: tHex(),
		orgEncryptedEncryptionKey: tHex(),

		status: t.text({ enum: ["s3", "foc", "unpaid_for", "invalid"] }).notNull(),
		onchainTxHash: tBytes32().unique().notNull(),

		placementCommitment: tBytes32().notNull(),
		placementManifestJson: t.jsonb().$type<PlacementManifest>().notNull(),

		warmParticipantCount: t.integer().notNull().default(0),
		coldInviteCount: t.integer().notNull().default(0),
		signerSlotCount: t.integer().notNull().default(0),
		recipientSlotCount: t.integer().notNull().default(0),

		...timestamps,
	},
	(table) => [
		t.index("idx_files_owner").on(table.sender),
		t.index("idx_files_sender_created").on(table.sender, table.createdAt),
		t.index("idx_files_organization").on(table.organizationId),
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
		bundleJson: t.jsonb().notNull(),
		executionStatus: t
			.text({ enum: ["fully_executed", "partially_executed"] })
			.notNull(),
		signaturesSnapshotCount: t.integer().notNull(),
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
