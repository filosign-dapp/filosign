import type { FilosignContracts } from "@filosign/evm";
import { computeCidIdentifier } from "@filosign/evm";
import type { SettlementReleaseType } from "@filosign/shared";
import {
	SETTLEMENT_RELEASE_TYPE_UINT,
	sortedCommitsForEmails,
} from "@filosign/shared";
import type { Address, Hex } from "viem";
import { encodeFunctionData } from "viem";
import type { SendFileProgressReporter } from "./send-file/progress";
import { emitSendFileProgress } from "./send-file/progress";
import { simulateSettlementWrite } from "./settlement-preflight";
import { releaseParamsToContractArgs } from "./settlement-rules";
import { parseRuleIdFromReceipt, waitForTxReceipt } from "./tx-receipt";
import type { FilosignWallet } from "./wallet";

export type AttachmentRuleDraft = {
	packetId: string;
	packetContentHash: Hex;
	releaseType: SettlementReleaseType;
	releaseParams: Parameters<typeof releaseParamsToContractArgs>[1];
	recipientEmails: string[];
	expiresAt?: bigint;
};

export async function registerAttachmentRulesOnChain(args: {
	wallet: FilosignWallet;
	contracts: FilosignContracts;
	pieceCid: string;
	rules: AttachmentRuleDraft[];
	onProgress?: SendFileProgressReporter;
}): Promise<
	Array<{
		packetId: string;
		onChainRuleId: string;
		releaseContractAddress: Address;
		registerRuleTxHash: Hex;
	}>
> {
	const release = args.contracts.FSAttachmentRelease;
	if (!release) {
		throw new Error("FSAttachmentRelease is not deployed for this chain");
	}

	const cidIdentifier = computeCidIdentifier(args.pieceCid);
	const registered: Array<{
		packetId: string;
		onChainRuleId: string;
		releaseContractAddress: Address;
		registerRuleTxHash: Hex;
	}> = [];

	for (let ruleIndex = 0; ruleIndex < args.rules.length; ruleIndex++) {
		const rule = args.rules[ruleIndex];
		if (!rule) continue;
		const { specificSignerCommitment, thresholdN, signerCommitments } =
			releaseParamsToContractArgs(rule.releaseType, rule.releaseParams);
		const recipientEmailCommitments = sortedCommitsForEmails(
			rule.recipientEmails,
		);
		const expiresAt = rule.expiresAt ?? 0n;

		const registerData = encodeFunctionData({
			abi: release.abi as readonly unknown[],
			functionName: "registerAttachmentRule",
			args: [
				cidIdentifier,
				rule.packetContentHash,
				SETTLEMENT_RELEASE_TYPE_UINT[rule.releaseType],
				specificSignerCommitment,
				thresholdN,
				expiresAt,
				signerCommitments,
				recipientEmailCommitments,
			],
		});

		emitSendFileProgress(args.onProgress, {
			phase: "wallet_attachment_rule",
			status: "wallet_prompt",
			ruleIndex,
		});

		await simulateSettlementWrite({
			contracts: args.contracts,
			wallet: args.wallet,
			address: release.address,
			abi: release.abi,
			functionName: "registerAttachmentRule",
			args: [
				cidIdentifier,
				rule.packetContentHash,
				SETTLEMENT_RELEASE_TYPE_UINT[rule.releaseType],
				specificSignerCommitment,
				thresholdN,
				expiresAt,
				signerCommitments,
				recipientEmailCommitments,
			],
		});

		const registerHash = await args.wallet.sendTransaction({
			to: release.address,
			data: registerData,
			account: args.wallet.account,
			chain: args.wallet.chain,
		});
		emitSendFileProgress(args.onProgress, {
			phase: "confirming_transaction",
			status: "confirming",
			txLabel: "attachment rule",
		});
		const registerReceipt = await waitForTxReceipt(
			args.contracts,
			registerHash,
			{
				label: "Attachment rule registration",
				abi: release.abi,
			},
		);
		const onChainRuleId = parseRuleIdFromReceipt({
			receipt: registerReceipt,
			emitter: release.address,
			abi: release.abi,
			eventName: "AttachmentRuleRegistered",
		});

		registered.push({
			packetId: rule.packetId,
			onChainRuleId,
			releaseContractAddress: release.address,
			registerRuleTxHash: registerHash,
		});

		emitSendFileProgress(args.onProgress, {
			phase: "wallet_attachment_rule",
			status: "done",
			ruleIndex,
		});
	}

	return registered;
}
