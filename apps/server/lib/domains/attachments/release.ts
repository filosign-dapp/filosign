import { and, eq } from "drizzle-orm";
import db from "@/lib/platform/db";
import { fsAttachmentReleaseAt } from "@/lib/platform/evm";
import { relayContractWrite } from "@/lib/platform/evm/contract-write";
import { withRelayerLock } from "@/lib/platform/evm/relayer-lock";
import { logger } from "@/lib/platform/pino";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

const { envelopeAttachmentPackets, attachmentReleaseRules } = db.schema;

type AttachmentReleaseWrite = {
	executeAttachmentRelease: (args: readonly [bigint]) => Promise<`0x${string}`>;
};

export async function tryExecuteAttachmentRelease(args: {
	onChainRuleId: bigint;
	releaseContractAddress: `0x${string}`;
}): Promise<{ released: boolean; txHash?: string; skipped?: string }> {
	const release = fsAttachmentReleaseAt(args.releaseContractAddress);
	if (!release) {
		return { released: false, skipped: "release_contract_unavailable" };
	}

	const ruleRes = await tryCatch(release.read.rules([args.onChainRuleId]));
	if (ruleRes.error) {
		return { released: false, skipped: "rule_read_failed" };
	}
	const released = ruleRes.data[8];
	const cancelled = ruleRes.data[9];
	if (released) return { released: true, skipped: "already_released" };
	if (cancelled) return { released: false, skipped: "cancelled" };

	const canRes = await tryCatch(release.read.canRelease([args.onChainRuleId]));
	if (canRes.error || !canRes.data) {
		return { released: false, skipped: "not_releasable" };
	}

	const write = relayContractWrite<AttachmentReleaseWrite>(release.write);
	const txRes = await tryCatch(
		withRelayerLock(() => write.executeAttachmentRelease([args.onChainRuleId])),
	);
	if (txRes.error) {
		logger.warn(
			{ err: txRes.error, onChainRuleId: args.onChainRuleId.toString() },
			"executeAttachmentRelease relay failed",
		);
		return { released: false, skipped: "relay_failed" };
	}

	return { released: true, txHash: txRes.data };
}

export async function tryExecuteAttachmentReleasesForPiece(pieceCid: string) {
	const rows = await db
		.select({
			onChainRuleId: attachmentReleaseRules.onChainRuleId,
			releaseContractAddress: attachmentReleaseRules.releaseContractAddress,
			packetRowId: attachmentReleaseRules.packetRowId,
		})
		.from(attachmentReleaseRules)
		.innerJoin(
			envelopeAttachmentPackets,
			eq(attachmentReleaseRules.packetRowId, envelopeAttachmentPackets.id),
		)
		.where(
			and(
				eq(attachmentReleaseRules.filePieceCid, pieceCid),
				eq(envelopeAttachmentPackets.releaseMode, "conditional"),
			),
		);

	for (const row of rows) {
		const result = await tryExecuteAttachmentRelease({
			onChainRuleId: row.onChainRuleId,
			releaseContractAddress: row.releaseContractAddress,
		});
		if (result.released && result.txHash) {
			logger.info(
				{
					pieceCid,
					onChainRuleId: row.onChainRuleId.toString(),
					txHash: result.txHash,
				},
				"attachment release executed",
			);
		}
	}
}

export async function runSyncAttachmentReleasesJob(): Promise<{
	released: number;
}> {
	const rows = await db
		.select({
			filePieceCid: attachmentReleaseRules.filePieceCid,
			onChainRuleId: attachmentReleaseRules.onChainRuleId,
			releaseContractAddress: attachmentReleaseRules.releaseContractAddress,
		})
		.from(attachmentReleaseRules)
		.innerJoin(
			envelopeAttachmentPackets,
			eq(attachmentReleaseRules.packetRowId, envelopeAttachmentPackets.id),
		)
		.where(eq(envelopeAttachmentPackets.releaseMode, "conditional"));

	let released = 0;
	const seen = new Set<string>();

	for (const row of rows) {
		const key = `${row.releaseContractAddress}:${row.onChainRuleId}`;
		if (seen.has(key)) continue;
		seen.add(key);

		const result = await tryExecuteAttachmentRelease({
			onChainRuleId: row.onChainRuleId,
			releaseContractAddress: row.releaseContractAddress,
		});
		if (
			result.released &&
			result.txHash &&
			!result.skipped?.startsWith("already")
		) {
			released++;
		}
	}

	return { released };
}
