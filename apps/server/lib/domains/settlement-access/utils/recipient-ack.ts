import { throwAppError } from "@filosign/errors/server";
import {
	SETTLEMENT_FEATURE_TERMS_VERSION,
	SETTLEMENT_RECIPIENT_ACK_INTENT_VERSION,
} from "@filosign/shared";
import { eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import db from "@/lib/platform/db";
import { fileSettlementRules } from "@/lib/platform/db/schema/settlements";

const { fileSettlementRecipientAcks } = db.schema;

export async function fileHasIndexedSettlementRules(
	pieceCid: string,
): Promise<boolean> {
	const [row] = await db
		.select({ pieceCid: fileSettlementRules.pieceCid })
		.from(fileSettlementRules)
		.where(eq(fileSettlementRules.pieceCid, pieceCid))
		.limit(1);
	return Boolean(row);
}

export async function assertSettlementRecipientAckProvided(args: {
	pieceCid: string;
	signerWallet: Address;
	body: unknown;
}) {
	const hasRules = await fileHasIndexedSettlementRules(args.pieceCid);
	if (!hasRules) return;

	const parsed = z
		.object({
			settlementRecipientAck: z.object({
				termsVersion: z.string().min(1),
				acceptedAt: z.number().int().positive(),
			}),
		})
		.safeParse(args.body);

	if (!parsed.success) {
		throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
			params: {
				reason:
					"Acknowledge the attached payout disclosure before signing this document",
			},
		});
	}

	const ack = parsed.data.settlementRecipientAck;
	if (ack.termsVersion !== SETTLEMENT_FEATURE_TERMS_VERSION) {
		throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
			params: {
				reason: "Payout disclosure version is outdated; refresh the sign page",
			},
		});
	}
}

export async function recordSettlementRecipientAck(args: {
	pieceCid: string;
	signerWallet: Address;
	termsVersion: string;
	acceptedAt: Date;
	requestIp?: string | null;
	requestUserAgent?: string | null;
}) {
	const hasRules = await fileHasIndexedSettlementRules(args.pieceCid);
	if (!hasRules) return;

	await db
		.insert(fileSettlementRecipientAcks)
		.values({
			filePieceCid: args.pieceCid,
			signerWallet: getAddress(args.signerWallet),
			termsVersion: args.termsVersion,
			acknowledgedAt: args.acceptedAt,
			requestIp: args.requestIp ?? null,
			requestUserAgent: args.requestUserAgent ?? null,
		})
		.onConflictDoUpdate({
			target: [
				fileSettlementRecipientAcks.filePieceCid,
				fileSettlementRecipientAcks.signerWallet,
			],
			set: {
				termsVersion: args.termsVersion,
				acknowledgedAt: args.acceptedAt,
				requestIp: args.requestIp ?? null,
				requestUserAgent: args.requestUserAgent ?? null,
				updatedAt: new Date(),
			},
		});
}

export async function loadSettlementRecipientAcksForPiece(pieceCid: string) {
	return db
		.select({
			signerWallet: fileSettlementRecipientAcks.signerWallet,
			termsVersion: fileSettlementRecipientAcks.termsVersion,
			acknowledgedAt: fileSettlementRecipientAcks.acknowledgedAt,
			intentVersion: fileSettlementRecipientAcks.termsVersion,
		})
		.from(fileSettlementRecipientAcks)
		.where(eq(fileSettlementRecipientAcks.filePieceCid, pieceCid));
}

export { SETTLEMENT_RECIPIENT_ACK_INTENT_VERSION };
