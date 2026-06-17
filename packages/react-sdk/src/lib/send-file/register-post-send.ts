import type { AttachmentPacketSendInput } from "@filosign/shared";
import { parseHexString, zSettlementReleaseParams } from "@filosign/shared";
import type { Address } from "viem";
import { isAddress } from "viem";
import type { AttachmentPacketDraft } from "../attachment-packets";
import {
	type AttachmentRuleDraft,
	registerAttachmentRulesOnChain,
} from "../register-attachment-rules";
import {
	registerSettlementRulesOnChain,
	type SettlementRuleDraft,
} from "../settlement-rules.ts";
import type { SendFileProgressReporter } from "./progress";
import { emitSendFileProgress } from "./progress";
import type { SendFileArgs, SendFileDeps } from "./types";

function resolveAttachmentRuleReleaseParams(
	releaseType: NonNullable<AttachmentPacketSendInput["releaseType"]>,
	releaseParams: AttachmentPacketDraft["releaseParams"],
): AttachmentRuleDraft["releaseParams"] {
	const candidate = releaseParams ?? { releaseType };
	if (candidate.releaseType !== releaseType) {
		throw new Error(
			`Attachment rule releaseType ${releaseType} does not match releaseParams.releaseType ${candidate.releaseType}`,
		);
	}
	return zSettlementReleaseParams.parse(candidate);
}

export async function registerConditionalAttachments(args: {
	deps: SendFileDeps;
	pieceCid: string;
	attachmentPacketDrafts: AttachmentPacketDraft[];
	attachmentPackets: AttachmentPacketSendInput[];
	onProgress?: SendFileProgressReporter;
}): Promise<void> {
	const conditionalDrafts = args.attachmentPacketDrafts.filter(
		(d) => d.releaseMode === "conditional",
	);
	if (conditionalDrafts.length === 0) return;

	emitSendFileProgress(args.onProgress, {
		phase: "processing_attachments",
		status: "start",
	});

	const registered = await registerAttachmentRulesOnChain({
		wallet: args.deps.wallet,
		contracts: args.deps.contracts,
		pieceCid: args.pieceCid,
		onProgress: args.onProgress,
		rules: conditionalDrafts.map((draft): AttachmentRuleDraft => {
			const packet = args.attachmentPackets.find(
				(p) => p.packetId === draft.packetId,
			);
			if (!packet?.packetContentHash) {
				throw new Error(
					`Missing packet hash for conditional packet ${draft.packetId}`,
				);
			}
			const releaseType = draft.releaseType ?? "all_signed";
			return {
				packetId: draft.packetId,
				packetContentHash: parseHexString(packet.packetContentHash),
				releaseType,
				releaseParams: resolveAttachmentRuleReleaseParams(
					releaseType,
					draft.releaseParams,
				),
				recipientEmails: draft.recipientEmails,
			};
		}),
	});

	for (const rec of registered) {
		const packet = args.attachmentPackets.find(
			(p) => p.packetId === rec.packetId,
		);
		if (!packet?.packetContentHash) continue;
		await args.deps.rpc.attachments.linkOnChainRule({
			pieceCid: args.pieceCid,
			packetId: rec.packetId,
			onChainRuleId: rec.onChainRuleId,
			releaseContractAddress: rec.releaseContractAddress,
			registerRuleTxHash: rec.registerRuleTxHash,
			packetContentHash: packet.packetContentHash,
		});
	}

	emitSendFileProgress(args.onProgress, {
		phase: "processing_attachments",
		status: "done",
	});
}

export async function registerSettlementRulesForFile(args: {
	deps: SendFileDeps;
	pieceCid: string;
	cidIdentifier: `0x${string}`;
	settlementRules: SettlementRuleDraft[];
	settlementPayerAddress?: Address;
	payoutPayerSource?: "sender" | "org_wallet";
	organizationId?: string;
	onProgress?: SendFileProgressReporter;
	registerSettlementRules?: SendFileArgs["registerSettlementRules"];
}): Promise<void> {
	if (args.settlementRules.length === 0) return;

	const payoutPayerSource = args.payoutPayerSource ?? "sender";

	if (payoutPayerSource === "org_wallet") {
		if (
			!args.settlementPayerAddress ||
			!isAddress(args.settlementPayerAddress)
		) {
			throw new Error(
				"Workspace treasury address is required for treasury payouts.",
			);
		}
		if (!args.registerSettlementRules) {
			throw new Error(
				"Treasury payout registration requires treasury wallet execution flow.",
			);
		}

		const settlementRuleRecords = await args.registerSettlementRules({
			payer: args.settlementPayerAddress,
			cidIdentifier: args.cidIdentifier,
			rules: args.settlementRules,
			onProgress: args.onProgress,
		});

		emitSendFileProgress(args.onProgress, {
			phase: "indexing_payout",
			status: "start",
		});
		await args.deps.rpcQuery.settlements.registerForFile.call({
			pieceCid: args.pieceCid,
			...(args.organizationId ? { organizationId: args.organizationId } : {}),
			rules: settlementRuleRecords,
		});
		emitSendFileProgress(args.onProgress, {
			phase: "indexing_payout",
			status: "done",
		});
		return;
	}

	const payer = args.settlementPayerAddress ?? args.deps.wallet.account.address;
	const payerIsConnectedWallet =
		payer.toLowerCase() === args.deps.wallet.account.address.toLowerCase();

	let settlementRuleRecords: Awaited<
		ReturnType<typeof registerSettlementRulesOnChain>
	>;

	if (payerIsConnectedWallet) {
		settlementRuleRecords = await registerSettlementRulesOnChain({
			wallet: args.deps.wallet,
			contracts: args.deps.contracts,
			chainKey: args.deps.chainKey,
			payer,
			cidIdentifier: args.cidIdentifier,
			rules: args.settlementRules,
			onProgress: args.onProgress,
		});
	} else if (args.registerSettlementRules) {
		settlementRuleRecords = await args.registerSettlementRules({
			payer,
			cidIdentifier: args.cidIdentifier,
			rules: args.settlementRules,
			onProgress: args.onProgress,
		});
	} else {
		throw new Error(
			"Treasury payout registration requires treasury wallet execution flow.",
		);
	}

	emitSendFileProgress(args.onProgress, {
		phase: "indexing_payout",
		status: "start",
	});
	await args.deps.rpcQuery.settlements.registerForFile.call({
		pieceCid: args.pieceCid,
		...(args.organizationId ? { organizationId: args.organizationId } : {}),
		rules: settlementRuleRecords,
	});
	emitSendFileProgress(args.onProgress, {
		phase: "indexing_payout",
		status: "done",
	});
}
