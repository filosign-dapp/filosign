import * as t from "drizzle-orm/pg-core";
import { tEvmAddress, tHex, timestamps } from "@/lib/platform/db/helpers";
import { randomUuidV7 } from "@/lib/platform/db/random-uuid-v7";
import { organizations } from "./organization";
import { users } from "./user";

export const draftStatuses = ["active", "archived", "sent"] as const;
export type DraftStatus = (typeof draftStatuses)[number];

export const draftExternalAccessKinds = ["warm", "cold"] as const;
export type DraftExternalAccessKind = (typeof draftExternalAccessKinds)[number];

export const envelopeDrafts = t.pgTable(
	"envelope_drafts",
	{
		id: t.uuid().primaryKey().$defaultFn(randomUuidV7),
		organizationId: t
			.uuid()
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		createdByWallet: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress),
		title: t.text().notNull().default("Untitled draft"),
		status: t.text({ enum: draftStatuses }).notNull().default("active"),
		revision: t.integer().notNull().default(0),
		headSnapshotS3Key: t.text(),
		/** Digest of the encrypted S3 snapshot payload for optimistic save/skip-upload checks. */
		headSnapshotDigest: t.text(),
		headDekWrappedOmk: tHex(),
		headOmkKemCiphertext: tHex(),
		sentPieceCid: t.text(),
		...timestamps,
	},
	(table) => [
		t.index("idx_envelope_drafts_org").on(table.organizationId),
		t.index("idx_envelope_drafts_creator").on(table.createdByWallet),
		t
			.index("idx_envelope_drafts_org_status")
			.on(table.organizationId, table.status),
		t.index("idx_envelope_drafts_updated_id").on(table.updatedAt, table.id),
	],
);

export const envelopeDraftDocuments = t.pgTable(
	"envelope_draft_documents",
	{
		id: t.uuid().primaryKey().$defaultFn(randomUuidV7),
		draftId: t
			.uuid()
			.notNull()
			.references(() => envelopeDrafts.id, { onDelete: "cascade" }),
		docId: t.text().notNull(),
		s3Key: t.text().notNull(),
		name: t.text().notNull(),
		size: t.integer().notNull(),
		mimeType: t.text().notNull(),
		...timestamps,
	},
	(table) => [
		t
			.uniqueIndex("uidx_envelope_draft_documents_draft_doc")
			.on(table.draftId, table.docId),
		t.index("idx_envelope_draft_documents_draft").on(table.draftId),
	],
);

export const draftExternalShares = t.pgTable(
	"draft_external_shares",
	{
		id: t.uuid().primaryKey().$defaultFn(randomUuidV7),
		draftId: t
			.uuid()
			.notNull()
			.references(() => envelopeDrafts.id, { onDelete: "cascade" }),
		email: t.text().notNull(),
		accessKind: t.text({ enum: draftExternalAccessKinds }).notNull(),
		inviteToken: t.text().notNull().unique(),
		recipientWallet: tEvmAddress(),
		kemCiphertext: tHex(),
		encryptedDek: tHex(),
		wrappedDek: tHex(),
		expiresAt: t.timestamp({ withTimezone: true }),
		revokedAt: t.timestamp({ withTimezone: true }),
		createdByWallet: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress),
		...timestamps,
	},
	(table) => [
		t.index("idx_draft_external_shares_draft").on(table.draftId),
		t.index("idx_draft_external_shares_token").on(table.inviteToken),
	],
);

export const draftComments = t.pgTable(
	"draft_comments",
	{
		id: t.uuid().primaryKey().$defaultFn(randomUuidV7),
		draftId: t
			.uuid()
			.notNull()
			.references(() => envelopeDrafts.id, { onDelete: "cascade" }),
		authorWallet: tEvmAddress().references(() => users.walletAddress),
		inviteToken: t.text(),
		ciphertext: tHex().notNull(),
		...timestamps,
	},
	(table) => [
		t.index("idx_draft_comments_draft").on(table.draftId),
		t
			.index("idx_draft_comments_draft_created")
			.on(table.draftId, table.createdAt),
	],
);
