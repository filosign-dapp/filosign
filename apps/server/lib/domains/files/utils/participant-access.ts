import { throwAppError } from "@filosign/errors/server";
import { isValidAckSignature } from "@filosign/shared";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import db from "@/lib/platform/db";

const {
	fileAcknowledgements,
	fileDocumentViews,
	fileParticipants,
	fileSignatures,
} = db.schema;

export type ValidAckRow = {
	ack: string;
	acknowledgedAt: Date;
	intentVersion: string;
};

export { isValidAckSignature };

export async function getValidAck(
	wallet: Address,
	pieceCid: string,
): Promise<ValidAckRow | null> {
	const walletNorm = getAddress(wallet);
	const [row] = await db
		.select({
			ack: fileAcknowledgements.ack,
			acknowledgedAt: fileAcknowledgements.acknowledgedAt,
			intentVersion: fileAcknowledgements.intentVersion,
		})
		.from(fileAcknowledgements)
		.where(
			and(
				eq(fileAcknowledgements.filePieceCid, pieceCid),
				eq(fileAcknowledgements.wallet, walletNorm),
			),
		);
	if (!row || !isValidAckSignature(row.ack)) return null;
	return row;
}

export async function getDocumentView(wallet: Address, pieceCid: string) {
	const walletNorm = getAddress(wallet);
	const [row] = await db
		.select({
			firstViewedAt: fileDocumentViews.firstViewedAt,
			lastViewedAt: fileDocumentViews.lastViewedAt,
			viewCount: fileDocumentViews.viewCount,
			source: fileDocumentViews.source,
		})
		.from(fileDocumentViews)
		.where(
			and(
				eq(fileDocumentViews.filePieceCid, pieceCid),
				eq(fileDocumentViews.wallet, walletNorm),
			),
		);
	return row ?? null;
}

export async function requireAckForParticipantAccess(
	wallet: Address,
	pieceCid: string,
): Promise<ValidAckRow> {
	const ack = await getValidAck(wallet, pieceCid);
	if (!ack) {
		throwAppError("SIGNING.ACK_REQUIRED");
	}
	return ack;
}

export async function requireCanSign(args: {
	wallet: Address;
	pieceCid: string;
	signAt?: Date;
}): Promise<{
	ack: ValidAckRow;
	view: NonNullable<Awaited<ReturnType<typeof getDocumentView>>>;
}> {
	const walletNorm = getAddress(args.wallet);
	const signAt = args.signAt ?? new Date();

	const [participant] = await db
		.select({ role: fileParticipants.role })
		.from(fileParticipants)
		.where(
			and(
				eq(fileParticipants.filePieceCid, args.pieceCid),
				eq(fileParticipants.wallet, walletNorm),
				eq(fileParticipants.role, "signer"),
			),
		);
	if (!participant) {
		throwAppError("SIGNING.NOT_REQUIRED");
	}

	const [existingSig] = await db
		.select({ signer: fileSignatures.signer })
		.from(fileSignatures)
		.where(
			and(
				eq(fileSignatures.filePieceCid, args.pieceCid),
				eq(fileSignatures.signer, walletNorm),
			),
		);
	if (existingSig) {
		throwAppError("SIGNING.ALREADY_SIGNED");
	}

	const ack = await requireAckForParticipantAccess(walletNorm, args.pieceCid);
	const view = await getDocumentView(walletNorm, args.pieceCid);
	if (!view) {
		throwAppError("SIGNING.VIEW_BEFORE_SIGN");
	}

	assertSignOrdering(ack.acknowledgedAt, view.firstViewedAt, signAt);

	return { ack, view };
}

export function assertSignOrdering(
	ackAt: Date,
	viewAt: Date,
	signAt: Date,
): void {
	if (viewAt.getTime() < ackAt.getTime()) {
		throwAppError("SIGNING.VIEW_AFTER_ACK");
	}
	if (signAt.getTime() < viewAt.getTime()) {
		throwAppError("SIGNING.VIEW_BEFORE_SIGN");
	}
}
