import type { AttachmentPacketSendInput } from "@filosign/shared";
import { parseHexString, zSettlementReleaseParams } from "@filosign/shared";
import type { AttachmentPacketDraft } from "../attachment-packets";
import {
	type AttachmentRuleDraft,
	registerAttachmentRulesOnChain,
} from "../register-attachment-rules";
import {
	registerSettlementRulesOnChain,
	type SettlementRuleDraft,
} from "../settlement-rules.ts";
import type { SendFileDeps } from "./types";

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
}): Promise<void> {
	const conditionalDrafts = args.attachmentPacketDrafts.filter(
		(d) => d.releaseMode === "conditional",
	);
	if (conditionalDrafts.length === 0) return;

	const registered = await registerAttachmentRulesOnChain({
		wallet: args.deps.wallet,
		contracts: args.deps.contracts,
		pieceCid: args.pieceCid,
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
}

export async function registerSettlementRulesForFile(args: {
	deps: SendFileDeps;
	pieceCid: string;
	cidIdentifier: `0x${string}`;
	settlementRules: SettlementRuleDraft[];
	organizationId?: string;
}): Promise<void> {
	if (args.settlementRules.length === 0) return;

	const settlementRuleRecords = await registerSettlementRulesOnChain({
		wallet: args.deps.wallet,
		contracts: args.deps.contracts,
		chainKey: args.deps.chainKey,
		payer: args.deps.wallet.account.address,
		cidIdentifier: args.cidIdentifier,
		rules: args.settlementRules,
	});

	await args.deps.rpcQuery.settlements.registerForFile.call({
		pieceCid: args.pieceCid,
		...(args.organizationId ? { organizationId: args.organizationId } : {}),
		rules: settlementRuleRecords,
	});
}
