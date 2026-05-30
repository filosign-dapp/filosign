import { isValidAckSignature } from "@filosign/shared";
import { ORPCError } from "@orpc/server";
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
		throw new ORPCError("FORBIDDEN", {
			message: "Acknowledge the document before accessing it",
		});
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
		throw new ORPCError("FORBIDDEN", {
			message: "You are not required to sign this file",
		});
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
		throw new ORPCError("CONFLICT", { message: "Already signed" });
	}

	const ack = await requireAckForParticipantAccess(walletNorm, args.pieceCid);
	const view = await getDocumentView(walletNorm, args.pieceCid);
	if (!view) {
		throw new ORPCError("FORBIDDEN", {
			message: "Open and view the document before signing",
		});
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
		throw new ORPCError("FORBIDDEN", {
			message: "Document must be viewed after acknowledgement",
		});
	}
	if (signAt.getTime() < viewAt.getTime()) {
		throw new ORPCError("FORBIDDEN", {
			message: "Document must be viewed before signing",
		});
	}
}
