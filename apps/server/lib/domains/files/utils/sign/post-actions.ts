import { tryExecuteAttachmentReleasesForPiece } from "@/lib/domains/attachments";
import {
	SERVER_ANALYTICS_EVENTS,
	trackServerEvent,
} from "@/lib/platform/analytics";
import { logger } from "@/lib/platform/pino";

export async function runPostPieceSignSideEffects(args: {
	pieceCid: string;
	signerWallet: `0x${string}`;
	isPractice: boolean;
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

	const { enqueuePostSignRoutingComplete, enqueuePayoutForPiece } =
		await import("@/lib/platform/jobs");

	const chainJobOptions = args.signTxHash
		? { signTxHash: args.signTxHash }
		: undefined;

	void enqueuePostSignRoutingComplete(args.pieceCid, chainJobOptions).catch(
		(err) => {
			logger.warn(
				{ err, pieceCid: args.pieceCid },
				"post-sign routing-complete enqueue failed",
			);
		},
	);

	void enqueuePayoutForPiece(args.pieceCid, chainJobOptions).catch((err) => {
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
