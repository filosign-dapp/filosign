import type { RegisterRoutingInput } from "@filosign/shared";
import { eq } from "drizzle-orm";
import type { Hex } from "viem";
import { getAddress } from "viem";
import {
	SERVER_ANALYTICS_EVENTS,
	trackServerEvent,
} from "@/lib/platform/analytics";
import db from "@/lib/platform/db";
import { evmClient } from "@/lib/platform/evm";
import { logger } from "@/lib/platform/pino";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { buildEnvelopeCompletedEmailOutboxRows } from "../completion-email";
import { waitingForMoreSigners } from "../envelope-waiting";
import {
	type EnvelopeRegistryProgress,
	isEnvelopeRoutingCompleteOnChain,
	readEnvelopeRegistryProgress,
} from "../piece-helpers";

const { files } = db.schema;

const ROUTING_READ_RETRIES = 4;
const ROUTING_READ_RETRY_MS = 400;

export class RoutingCompleteRetryableError extends Error {
	constructor(
		public readonly reason: string,
		public readonly pieceCid: string,
	) {
		super(`routing complete check retryable: ${reason}`);
		this.name = "RoutingCompleteRetryableError";
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryRoutingIncomplete(
	progress: EnvelopeRegistryProgress | null,
): boolean {
	if (!progress || progress.completedAt != null) {
		return false;
	}
	if (progress.quorumN > 0) {
		return progress.requiredSignaturesCount >= progress.quorumN;
	}
	return (
		progress.requiredSignaturesCount >= progress.requiredSignersCount &&
		progress.requiredSignersCount > 0
	);
}

async function resolveRoutingCompleteAfterSign(args: {
	pieceCid: string;
	registryAddress: `0x${string}`;
	registerRoutingJson: RegisterRoutingInput | null;
	signTxHash?: Hex;
}): Promise<{
	routingComplete: boolean;
	progress: EnvelopeRegistryProgress | null;
}> {
	const registryAddress = getAddress(args.registryAddress) as `0x${string}`;
	const readProgress = (blockNumber?: bigint) =>
		readEnvelopeRegistryProgress({
			pieceCid: args.pieceCid,
			registryAddress,
			registerRouting: args.registerRoutingJson ?? undefined,
			blockNumber,
		});

	let progress: EnvelopeRegistryProgress | null = null;

	if (args.signTxHash) {
		const receiptRes = await tryCatch(
			evmClient.waitForTransactionReceipt({ hash: args.signTxHash }),
		);
		if (receiptRes.error) {
			logger.warn(
				{
					err: receiptRes.error,
					pieceCid: args.pieceCid,
					txHash: args.signTxHash,
				},
				"post-sign routing: sign tx receipt wait failed",
			);
		} else {
			progress = await readProgress(receiptRes.data.blockNumber);
			if (progress?.completedAt != null) {
				return { routingComplete: true, progress };
			}

			for (let attempt = 0; attempt < ROUTING_READ_RETRIES; attempt++) {
				await sleep(ROUTING_READ_RETRY_MS);
				progress = await readProgress();
				if (progress?.completedAt != null) {
					return { routingComplete: true, progress };
				}
			}
		}
	}

	if (progress?.completedAt != null) {
		return { routingComplete: true, progress };
	}

	const routingComplete = await isEnvelopeRoutingCompleteOnChain(
		args.pieceCid,
		{
			registryAddress,
			registerRoutingJson: args.registerRoutingJson,
		},
	);
	if (!routingComplete) {
		progress = await readProgress();
	}
	return { routingComplete, progress };
}

async function tryFocStubForRoutingCompletePiece(args: {
	pieceCid: string;
	organizationId: string | null;
}): Promise<void> {
	const { isFocBackupEnabled } = await import("@/lib/domains/foc/enabled");
	if (!isFocBackupEnabled() || !args.organizationId) {
		return;
	}

	const { tryFocForRoutingCompletePiece } = await import(
		"@/lib/domains/foc/lifecycle"
	);
	await tryFocForRoutingCompletePiece(args.pieceCid);
}

async function handleEnvelopeRoutingComplete(args: {
	pieceCid: string;
	sender: `0x${string}`;
	organizationId: string | null;
}): Promise<void> {
	await db
		.update(files)
		.set({ completedAt: new Date(), updatedAt: new Date() })
		.where(eq(files.pieceCid, args.pieceCid));

	const { enqueueOutboxByIds, insertJobOutboxRows } = await import(
		"@/lib/platform/jobs"
	);
	const completionOutbox = await buildEnvelopeCompletedEmailOutboxRows({
		pieceCid: args.pieceCid,
		sender: getAddress(args.sender) as `0x${string}`,
	});
	if (completionOutbox.length > 0) {
		const inserted = await db.transaction(async (tx) =>
			insertJobOutboxRows(tx, completionOutbox),
		);
		await enqueueOutboxByIds(inserted.map((r) => r.id));
	}

	trackServerEvent({
		distinctId: getAddress(args.sender),
		event: SERVER_ANALYTICS_EVENTS.envelopeFullySigned,
		pieceCid: args.pieceCid,
	});

	await tryFocStubForRoutingCompletePiece({
		pieceCid: args.pieceCid,
		organizationId: args.organizationId,
	});

	const { enqueuePayoutForPiece } = await import("@/lib/platform/jobs");
	await enqueuePayoutForPiece(args.pieceCid);
}

/** BullMQ worker: wait for sign receipt, detect routing complete, run completion + FOC. */
export async function runPostSignRoutingCompleteJob(args: {
	pieceCid: string;
	signTxHash?: Hex;
}): Promise<void> {
	const [file] = await db
		.select({
			sender: files.sender,
			organizationId: files.organizationId,
			registryAddress: files.registryAddress,
			registerRoutingJson: files.registerRoutingJson,
			completedAt: files.completedAt,
		})
		.from(files)
		.where(eq(files.pieceCid, args.pieceCid))
		.limit(1);

	if (!file) {
		return;
	}

	if (file.completedAt != null) {
		await tryFocStubForRoutingCompletePiece({
			pieceCid: args.pieceCid,
			organizationId: file.organizationId,
		});
		return;
	}

	const { routingComplete, progress } = await resolveRoutingCompleteAfterSign({
		pieceCid: args.pieceCid,
		registryAddress: file.registryAddress as `0x${string}`,
		registerRoutingJson: file.registerRoutingJson,
		signTxHash: args.signTxHash,
	});

	if (routingComplete) {
		await handleEnvelopeRoutingComplete({
			pieceCid: args.pieceCid,
			sender: getAddress(file.sender) as `0x${string}`,
			organizationId: file.organizationId,
		});
		return;
	}

	if (waitingForMoreSigners(progress)) {
		return;
	}

	if (shouldRetryRoutingIncomplete(progress)) {
		throw new RoutingCompleteRetryableError(
			"routing_incomplete_after_sign",
			args.pieceCid,
		);
	}

	logger.warn(
		{
			pieceCid: args.pieceCid,
			requiredSignersCount: progress?.requiredSignersCount,
			requiredSignaturesCount: progress?.requiredSignaturesCount,
			quorumN: progress?.quorumN,
		},
		"post-sign routing: incomplete with no retry policy",
	);
}
