import { and, eq } from "drizzle-orm";
import {
	readPieceRelayerPin,
	writePieceRelayerPin,
} from "@/lib/domains/files/utils/relayer-pin";
import db from "@/lib/platform/db";
import { fsAttachmentReleaseAt } from "@/lib/platform/evm";
import { relayContractWrite } from "@/lib/platform/evm/contract-write";
import { withRelayerPoolFailover } from "@/lib/platform/evm/relay-failover";
import {
	createRelayReceiptWaiter,
	relayWrite,
} from "@/lib/platform/evm/relay-write";
import { withRelayerLock } from "@/lib/platform/evm/relayer-lock";
import {
	fsContractsForRelayer,
	getRelayerWalletClient,
	routeRelayerForPiece,
} from "@/lib/platform/evm/relayer-pool";
import { logger } from "@/lib/platform/pino";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

const { envelopeAttachmentPackets, attachmentReleaseRules } = db.schema;

type AttachmentReleaseWrite = {
	executeAttachmentRelease: (args: readonly [bigint]) => Promise<`0x${string}`>;
};

export async function tryExecuteAttachmentRelease(args: {
	pieceCid: string;
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

	const pinnedRelayerAddress = await readPieceRelayerPin(args.pieceCid);
	const primary = routeRelayerForPiece({
		pieceCid: args.pieceCid,
		pinnedRelayerAddress,
	});

	const txRes = await tryCatch(
		withRelayerPoolFailover({
			primary,
			step: "executeAttachmentRelease",
			context: { pieceCid: args.pieceCid },
			run: async (member) => {
				const relayerContracts = fsContractsForRelayer(member.address);
				const releaseContract =
					relayerContracts.FSAttachmentRelease?.address.toLowerCase() ===
					args.releaseContractAddress.toLowerCase()
						? relayerContracts.FSAttachmentRelease
						: release;
				const write = relayContractWrite<AttachmentReleaseWrite>(
					releaseContract.write,
				);
				const waitForReceipt = createRelayReceiptWaiter(
					getRelayerWalletClient(member.address),
				);

				return withRelayerLock(member.address, () =>
					relayWrite({
						step: "executeAttachmentRelease",
						write: () => write.executeAttachmentRelease([args.onChainRuleId]),
						waitForReceipt,
					}),
				);
			},
		}),
	);
	if (txRes.error) {
		logger.warn(
			{ err: txRes.error, onChainRuleId: args.onChainRuleId.toString() },
			"executeAttachmentRelease relay failed",
		);
		return { released: false, skipped: "relay_failed" };
	}

	const txHash = txRes.data.result;
	await writePieceRelayerPin(args.pieceCid, txRes.data.relayer.address).catch(
		() => undefined,
	);

	await db
		.update(attachmentReleaseRules)
		.set({
			releaseTxHash: txHash,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(
					attachmentReleaseRules.releaseContractAddress,
					args.releaseContractAddress,
				),
				eq(attachmentReleaseRules.onChainRuleId, args.onChainRuleId),
			),
		);

	return { released: true, txHash };
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
			pieceCid,
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
			pieceCid: row.filePieceCid,
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
