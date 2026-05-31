import type { FilosignContracts } from "@filosign/contracts";
import { computeCidIdentifier } from "@filosign/contracts";
import type { SettlementReleaseType } from "@filosign/shared";
import {
	hashNormalizedSignerEmail,
	SETTLEMENT_RELEASE_TYPE_UINT,
} from "@filosign/shared";
import type { Address, Hex } from "viem";
import { encodeFunctionData } from "viem";
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

	for (const rule of args.rules) {
		const { specificSignerCommitment, thresholdN, signerCommitments } =
			releaseParamsToContractArgs(rule.releaseType, rule.releaseParams);
		const recipientEmailCommitments = rule.recipientEmails.map((email) =>
			hashNormalizedSignerEmail(email),
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

		const registerHash = await args.wallet.sendTransaction({
			to: release.address,
			data: registerData,
			account: args.wallet.account,
			chain: args.wallet.chain,
		});
		const registerReceipt = await waitForTxReceipt(
			args.contracts,
			registerHash,
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
	}

	return registered;
}
