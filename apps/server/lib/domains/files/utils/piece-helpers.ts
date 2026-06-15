import { throwAppError } from "@filosign/errors/server";
import { computeCidIdentifier } from "@filosign/evm";
import {
	isValidAckSignature,
	type PlacementManifest,
	type RegisterRoutingInput,
} from "@filosign/shared";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import db from "@/lib/platform/db";
import {
	fsAttachmentReleaseAt,
	fsEnvelopeRegistryAt,
} from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { primaryEmailForWallet } from "../invites";
import {
	applySequentialCanSignGate,
	applySequentialNextSigner,
} from "./envelope-registry-sequential";

const {
	fileAcknowledgements,
	fileDocumentViews,
	fileParticipants,
	fileSignatures,
	envelopeAttachmentPackets,
	files,
} = db.schema;

export type ValidAckRow = {
	ack: string;
	acknowledgedAt: Date;
	intentVersion: string;
};

export type EnvelopeRegistryProgress = {
	routingMode: number;
	requiredSignersCount: number;
	requiredSignaturesCount: number;
	quorumN: number;
	/** Unix seconds from chain; null while incomplete. */
	completedAt: number | null;
	/** Unix seconds from chain attested void; null while active. */
	revokedBeforeCompletedAt: number | null;
	revokedBy: Address | null;
	/** Sequential: email of next signer who has not signed yet, if known. */
	nextSignerEmail: string | null;
	/** Sequential: signing order emails from register routing, when configured. */
	routingOrderEmails: string[] | null;
	/** False when sequential order blocks the given signer email. */
	canSignByRouting: boolean;
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

/** Sender-as-signer envelopes store one participant row (role sender); mirror pieceSign. */
export async function resolveSignerWalletForFieldDraft(args: {
	userWallet: Address;
	pieceCid: string;
	sender: Address;
	placementManifest: PlacementManifest;
}): Promise<Address> {
	const walletNorm = getAddress(args.userWallet);

	const [participantRecord] = await db
		.select({ wallet: fileParticipants.wallet })
		.from(fileParticipants)
		.where(
			and(
				eq(fileParticipants.filePieceCid, args.pieceCid),
				eq(fileParticipants.role, "signer"),
				eq(fileParticipants.wallet, walletNorm),
			),
		);
	if (participantRecord) {
		return getAddress(participantRecord.wallet);
	}

	if (getAddress(args.sender) !== walletNorm) {
		throwAppError("SIGNING.NOT_REQUIRED");
	}

	const senderEmail = await primaryEmailForWallet(walletNorm);
	if (!senderEmail) {
		throwAppError("SIGNING.EMAIL_REQUIRED");
	}

	const hasAssignedFields = args.placementManifest.fields.some(
		(f) => f.assignedRecipientEmail === senderEmail,
	);
	if (!hasAssignedFields) {
		throwAppError("SIGNING.NOT_REQUIRED");
	}

	return walletNorm;
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

export async function listConditionalAttachmentPacketsForSender(
	pieceCid: string,
) {
	const rows = await db
		.select({
			packetId: envelopeAttachmentPackets.packetId,
			label: envelopeAttachmentPackets.label,
			onChainRuleId: envelopeAttachmentPackets.onChainRuleId,
			releaseContractAddress: envelopeAttachmentPackets.releaseContractAddress,
		})
		.from(envelopeAttachmentPackets)
		.where(
			and(
				eq(envelopeAttachmentPackets.filePieceCid, pieceCid),
				eq(envelopeAttachmentPackets.releaseMode, "conditional"),
			),
		);

	const out: Array<{
		packetId: string;
		label: string | null;
		onChainRuleId: string;
		releaseContractAddress: `0x${string}`;
		released: boolean;
		cancelled: boolean;
	}> = [];

	for (const row of rows) {
		if (row.onChainRuleId == null || !row.releaseContractAddress) continue;
		const release = fsAttachmentReleaseAt(row.releaseContractAddress);
		if (!release) continue;
		const ruleRes = await tryCatch(release.read.rules([row.onChainRuleId]));
		const released = !ruleRes.error && ruleRes.data[8];
		const cancelled = !ruleRes.error && ruleRes.data[9];
		out.push({
			packetId: row.packetId,
			label: row.label,
			onChainRuleId: row.onChainRuleId.toString(),
			releaseContractAddress: row.releaseContractAddress,
			released,
			cancelled,
		});
	}

	return out;
}

function chainTimestampToUnix(
	value: number | bigint | undefined | null,
): number | null {
	if (value == null) return null;
	const n = Number(value);
	return n > 0 ? n : null;
}

export async function readEnvelopeRegistryProgress(args: {
	pieceCid: string;
	registryAddress: `0x${string}`;
	registerRouting?: RegisterRoutingInput | null;
	signerEmail?: string | null;
	/** Pin eth_call to a mined block (e.g. sign tx receipt) to avoid stale RPC reads. */
	blockNumber?: bigint;
}): Promise<EnvelopeRegistryProgress | null> {
	const registry = fsEnvelopeRegistryAt(args.registryAddress);
	const cidId = computeCidIdentifier(args.pieceCid);

	const readOptions =
		args.blockNumber !== undefined ? { blockNumber: args.blockNumber } : {};
	const regRes = await tryCatch(
		registry.read.envelopeRegistrations([cidId], readOptions),
	);
	if (regRes.error || Number(regRes.data.timestamp) === 0) {
		return null;
	}
	const reg = regRes.data as {
		routingMode: number;
		requiredSignersCount: number;
		requiredSignaturesCount: number;
		quorumN: number;
		completedAt?: number | bigint;
		revokedBeforeCompletedAt?: number | bigint;
		revokedBy?: Address;
	};

	const routingMode = Number(reg.routingMode);
	const revokedBeforeCompletedAt = chainTimestampToUnix(
		reg.revokedBeforeCompletedAt,
	);
	const completedAt = chainTimestampToUnix(reg.completedAt);
	const isRevoked = revokedBeforeCompletedAt != null;
	const isComplete = completedAt != null;

	const progress: EnvelopeRegistryProgress = {
		routingMode,
		requiredSignersCount: Number(reg.requiredSignersCount),
		requiredSignaturesCount: Number(reg.requiredSignaturesCount),
		quorumN: Number(reg.quorumN),
		completedAt: isComplete ? (completedAt ?? 1) : null,
		revokedBeforeCompletedAt: isRevoked
			? (revokedBeforeCompletedAt ?? 1)
			: null,
		revokedBy:
			reg.revokedBy &&
			reg.revokedBy !== "0x0000000000000000000000000000000000000000"
				? getAddress(reg.revokedBy)
				: null,
		nextSignerEmail: null,
		routingOrderEmails: null,
		canSignByRouting: !isRevoked && !isComplete,
	};

	const routing = args.registerRouting;
	if (routing?.routingMode === 1 && routing.routingOrderEmails?.length) {
		progress.routingOrderEmails = [...routing.routingOrderEmails];
	}
	if (routing) {
		await applySequentialNextSigner({
			registry,
			cidId,
			routing,
			progress,
		});
	}

	if (args.signerEmail && routing) {
		await applySequentialCanSignGate({
			registry,
			cidId,
			routing,
			signerEmail: args.signerEmail,
			progress,
		});
	}

	return progress;
}

/** Envelope complete on-chain when `completedAt` is set. */
export async function isEnvelopeRoutingCompleteOnChain(
	pieceCid: string,
	file?: {
		registryAddress: `0x${string}`;
		registerRoutingJson?: RegisterRoutingInput | null;
	},
): Promise<boolean> {
	const registryAddress =
		file?.registryAddress ??
		(
			await db
				.select({ registryAddress: files.registryAddress })
				.from(files)
				.where(eq(files.pieceCid, pieceCid))
				.limit(1)
		)[0]?.registryAddress;

	if (!registryAddress) return false;

	const progress = await readEnvelopeRegistryProgress({
		pieceCid,
		registryAddress: getAddress(registryAddress),
		registerRouting: file?.registerRoutingJson ?? undefined,
	});

	return progress?.completedAt != null;
}

export function envelopeRoutingCompleteFromProgress(
	progress: EnvelopeRegistryProgress,
): boolean {
	return progress.completedAt != null;
}

function chainTimestampToDate(unixSeconds: number): Date {
	return unixSeconds > 1 ? new Date(unixSeconds * 1000) : new Date();
}

/** Sync DB finalization timestamps when chain is ahead of Postgres. */
export async function backfillFileFinalizationFromChain(args: {
	pieceCid: string;
	file: {
		completedAt: Date | null;
		revokedBeforeCompletedAt: Date | null;
	};
	progress: EnvelopeRegistryProgress;
}): Promise<void> {
	const updates: {
		completedAt?: Date;
		revokedBeforeCompletedAt?: Date;
		updatedAt: Date;
	} = { updatedAt: new Date() };

	if (args.file.completedAt == null && args.progress.completedAt != null) {
		updates.completedAt = chainTimestampToDate(args.progress.completedAt);
		updates.updatedAt = updates.completedAt;
	}
	if (
		args.file.revokedBeforeCompletedAt == null &&
		args.progress.revokedBeforeCompletedAt != null
	) {
		updates.revokedBeforeCompletedAt = chainTimestampToDate(
			args.progress.revokedBeforeCompletedAt,
		);
		updates.updatedAt = updates.revokedBeforeCompletedAt;
	}

	const hasBackfill =
		updates.completedAt != null || updates.revokedBeforeCompletedAt != null;
	if (!hasBackfill) return;

	await db.update(files).set(updates).where(eq(files.pieceCid, args.pieceCid));
}
