import {
	type AttachmentPacketReleaseMode,
	attachmentPacketReleaseModes,
	settlementReleaseTypes,
} from "@filosign/shared";
import * as t from "drizzle-orm/pg-core";
import {
	tBytes32,
	tEvmAddress,
	tHex,
	timestamps,
} from "@/lib/platform/db/helpers";
import { randomUuidV7 } from "@/lib/platform/db/random-uuid-v7";
import { files } from "./file";

export const envelopeAttachmentPackets = t.pgTable(
	"envelope_attachment_packets",
	{
		id: t
			.uuid()
			.primaryKey()
			.$defaultFn(() => randomUuidV7()),
		filePieceCid: t
			.text()
			.notNull()
			.references(() => files.pieceCid, { onDelete: "cascade" }),
		packetId: t.text().notNull(),
		packetCid: t.text().notNull(),
		label: t.text(),
		releaseMode: t
			.text({ enum: attachmentPacketReleaseModes })
			.notNull()
			.$type<AttachmentPacketReleaseMode>(),
		releaseType: t.text({ enum: settlementReleaseTypes }),
		releaseParams: t.jsonb().$type<Record<string, unknown>>(),
		recipientsCommitment: tBytes32(),
		onChainRuleId: t.bigint({ mode: "bigint" }),
		releaseContractAddress: tEvmAddress(),
		registerRuleTxHash: tBytes32(),
		...timestamps,
	},
	(table) => [
		t
			.uniqueIndex("uq_attachment_packets_piece_packet")
			.on(table.filePieceCid, table.packetId),
		t.index("idx_attachment_packets_piece").on(table.filePieceCid),
	],
);

export const envelopeAttachmentPacketRecipients = t.pgTable(
	"envelope_attachment_packet_recipients",
	{
		id: t
			.uuid()
			.primaryKey()
			.$defaultFn(() => randomUuidV7()),
		packetRowId: t
			.uuid()
			.notNull()
			.references(() => envelopeAttachmentPackets.id, {
				onDelete: "cascade",
			}),
		email: t.text().notNull(),
		emailCommitment: tBytes32().notNull(),
		wallet: tEvmAddress(),
		deliveryKind: t
			.text({ enum: ["warm", "cold_pending", "cold_claimed"] })
			.notNull(),
		kemCiphertext: tHex(),
		encryptedPacketDek: tHex(),
		...timestamps,
	},
	(table) => [
		t
			.uniqueIndex("uq_attachment_packet_recipient")
			.on(table.packetRowId, table.email),
	],
);

export const envelopeAttachmentPacketColdWraps = t.pgTable(
	"envelope_attachment_packet_cold_wraps",
	{
		id: t
			.uuid()
			.primaryKey()
			.$defaultFn(() => randomUuidV7()),
		packetRowId: t
			.uuid()
			.notNull()
			.references(() => envelopeAttachmentPackets.id, {
				onDelete: "cascade",
			}),
		email: t.text().notNull(),
		wrappedPacketDek: tHex().notNull(),
		inviteToken: t.text().notNull(),
		...timestamps,
	},
	(table) => [
		t
			.uniqueIndex("uq_attachment_packet_cold_wrap")
			.on(table.packetRowId, table.email),
	],
);

export const attachmentReleaseRules = t.pgTable(
	"attachment_release_rules",
	{
		id: t
			.uuid()
			.primaryKey()
			.$defaultFn(() => randomUuidV7()),
		packetRowId: t
			.uuid()
			.notNull()
			.references(() => envelopeAttachmentPackets.id, {
				onDelete: "cascade",
			}),
		filePieceCid: t.text().notNull(),
		onChainRuleId: t.bigint({ mode: "bigint" }).notNull(),
		releaseContractAddress: tEvmAddress().notNull(),
		packetContentHash: tBytes32().notNull(),
		...timestamps,
	},
	(table) => [
		t
			.uniqueIndex("uq_attachment_release_rules_validator_rule")
			.on(table.releaseContractAddress, table.onChainRuleId),
	],
);
