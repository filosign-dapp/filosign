import type { RegisterRoutingInput } from "@filosign/shared";
import { eq } from "drizzle-orm";
import { getAddress } from "viem";
import env from "@/env";
import { tryExecuteAttachmentReleasesForPiece } from "@/lib/domains/attachments";
import {
	SERVER_ANALYTICS_EVENTS,
	trackServerEvent,
} from "@/lib/platform/analytics";
import db from "@/lib/platform/db";
import { logger } from "@/lib/platform/pino";
import { buildEnvelopeCompletedEmailOutboxRows } from "../completion-email";
import { isEnvelopeRoutingCompleteOnChain } from "../piece-helpers";

const { files } = db.schema;

export async function runPostPieceSignSideEffects(args: {
	pieceCid: string;
	signerWallet: `0x${string}`;
	sender: `0x${string}`;
	organizationId: string | null;
	isPractice: boolean;
	registryAddress: `0x${string}`;
	registerRoutingJson: RegisterRoutingInput | null;
	fieldCount: number;
	signTxHash?: `0x${string}`;
}): Promise<void> {
	trackServerEvent({
		distinctId: args.signerWallet,
		event: SERVER_ANALYTICS_EVENTS.pieceSigned,
		pieceCid: args.pieceCid,
		properties: { field_count: args.fieldCount },
	});

	if (args.isPractice) {
		const { userActivationOnPracticeSigned } = await import(
			"@/lib/domains/users/activation"
		);
		await userActivationOnPracticeSigned(args.signerWallet);
	}

	const routingComplete = await isEnvelopeRoutingCompleteOnChain(
		args.pieceCid,
		{
			registryAddress: getAddress(args.registryAddress),
			registerRoutingJson: args.registerRoutingJson,
		},
	);
	if (routingComplete) {
		await handleEnvelopeRoutingComplete(args);
	} else if (env.TEST_FOC) {
		const { logFocSmoke } = await import("@/lib/domains/foc");
		logFocSmoke("sign recorded; routing not complete yet (no FOC stub)", {
			pieceCid: args.pieceCid,
		});
	}

	const { enqueuePayoutForPiece } = await import("@/lib/platform/jobs");
	void enqueuePayoutForPiece(args.pieceCid, {
		...(args.signTxHash ? { signTxHash: args.signTxHash } : {}),
	}).catch((err) => {
		logger.warn(
			{ err, pieceCid: args.pieceCid },
			"post-sign settlement enqueue failed; use Send payout or daily sync",
		);
	});

	void tryExecuteAttachmentReleasesForPiece(args.pieceCid).catch((err) => {
		logger.warn(
			{ err, pieceCid: args.pieceCid },
			"post-sign attachment release failed; daily sync will retry",
		);
	});
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
		sender: getAddress(args.sender),
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

	if (args.organizationId) {
		const { createFocStubForCompletedEnvelope, logFocSmoke } =
			await import("@/lib/domains/foc");
		logFocSmoke("routing complete; creating FOC stub", {
			pieceCid: args.pieceCid,
			organizationId: args.organizationId,
		});
		try {
			await createFocStubForCompletedEnvelope(
				args.pieceCid,
				args.organizationId,
			);
			if (env.TEST_FOC) {
				const { enqueueFocTransition } = await import("@/lib/platform/jobs");
				await enqueueFocTransition(args.pieceCid);
				logFocSmoke("enqueued foc-transition job (TEST_FOC)", {
					pieceCid: args.pieceCid,
				});
			}
		} catch (err) {
			logger.warn(
				{ err, pieceCid: args.pieceCid, organizationId: args.organizationId },
				"completed envelope: FOC transition stub failed",
			);
		}
	} else {
		const { logFocSmoke } = await import("@/lib/domains/foc");
		logFocSmoke("routing complete; skipped FOC (no organizationId on file)", {
			pieceCid: args.pieceCid,
		});
	}
}
