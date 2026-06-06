import { throwAppError } from "@filosign/errors/server";
import type { SettlementRuleRegistrationInput } from "@filosign/shared";
import type { fsPaymentValidatorAt } from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import type { OnChainRuleHeader } from "./rule-header";

function normHex(a: string) {
	return a.toLowerCase();
}

type ReleaseParamVerifier = (args: {
	validator: ReturnType<typeof fsPaymentValidatorAt>;
	rule: SettlementRuleRegistrationInput;
	header: OnChainRuleHeader;
}) => Promise<void>;

async function verifySpecificSignerRelease(args: {
	rule: SettlementRuleRegistrationInput;
	header: OnChainRuleHeader;
}): Promise<void> {
	const { rule, header } = args;
	const specificCommitment = header[4];
	if (
		rule.releaseType !== "specific_signer" ||
		rule.releaseParams.releaseType !== "specific_signer"
	) {
		return;
	}
	if (
		normHex(specificCommitment) !==
		normHex(rule.releaseParams.signerEmailCommitment)
	) {
		throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
			params: {
				reason: "On-chain signer commitment does not match settlement rule",
			},
		});
	}
}

async function verifyCommitmentSetRelease(args: {
	validator: ReturnType<typeof fsPaymentValidatorAt>;
	rule: SettlementRuleRegistrationInput;
}): Promise<void> {
	const { validator, rule } = args;
	const needsCommitments =
		rule.releaseType === "at_least_n" ||
		rule.releaseType === "quorum_set" ||
		rule.releaseType === "all_of_set";
	if (!needsCommitments) return;

	const ruleId = BigInt(rule.onChainRuleId);
	const commitmentsRes = await tryCatch(
		validator.read.signerCommitments([ruleId]),
	);
	if (commitmentsRes.error || !commitmentsRes.data) {
		throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
			params: {
				reason: "On-chain signer commitments missing for settlement rule",
			},
		});
	}
	const onChain = commitmentsRes.data.map(normHex).sort();
	const submitted =
		rule.releaseParams.releaseType === "at_least_n" ||
		rule.releaseParams.releaseType === "quorum_set" ||
		rule.releaseParams.releaseType === "all_of_set"
			? [...rule.releaseParams.signerEmailCommitments].map(normHex).sort()
			: [];
	if (
		onChain.length !== submitted.length ||
		onChain.some((c, i) => c !== submitted[i])
	) {
		throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
			params: {
				reason:
					"On-chain signer commitments do not match submitted settlement rule",
			},
		});
	}
}

async function verifyThresholdRelease(args: {
	rule: SettlementRuleRegistrationInput;
	header: OnChainRuleHeader;
}): Promise<void> {
	const { rule, header } = args;
	const thresholdN = header[5];
	const thresholdPairs: Array<{
		releaseType: SettlementRuleRegistrationInput["releaseType"];
		paramType: SettlementRuleRegistrationInput["releaseParams"]["releaseType"];
		value: number;
		reason: string;
	}> = [
		{
			releaseType: "at_least_n",
			paramType: "at_least_n",
			value:
				rule.releaseParams.releaseType === "at_least_n"
					? rule.releaseParams.thresholdN
					: 0,
			reason: "On-chain threshold does not match settlement rule",
		},
		{
			releaseType: "quorum_set",
			paramType: "quorum_set",
			value:
				rule.releaseParams.releaseType === "quorum_set"
					? rule.releaseParams.thresholdN
					: 0,
			reason: "On-chain quorum threshold does not match settlement rule",
		},
		{
			releaseType: "quorum_required",
			paramType: "quorum_required",
			value:
				rule.releaseParams.releaseType === "quorum_required"
					? rule.releaseParams.thresholdN
					: 0,
			reason: "On-chain threshold does not match settlement rule",
		},
		{
			releaseType: "quorum_all",
			paramType: "quorum_all",
			value:
				rule.releaseParams.releaseType === "quorum_all"
					? rule.releaseParams.thresholdN
					: 0,
			reason: "On-chain threshold does not match settlement rule",
		},
	];

	for (const pair of thresholdPairs) {
		if (
			rule.releaseType !== pair.releaseType ||
			rule.releaseParams.releaseType !== pair.paramType
		) {
			continue;
		}
		if (Number(thresholdN) !== pair.value) {
			throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
				params: { reason: pair.reason },
			});
		}
	}
}

const RELEASE_PARAM_VERIFIERS: ReleaseParamVerifier[] = [
	async ({ rule, header }) => {
		await verifySpecificSignerRelease({ rule, header });
	},
	async ({ validator, rule }) => {
		await verifyCommitmentSetRelease({ validator, rule });
	},
	async ({ rule, header }) => {
		await verifyThresholdRelease({ rule, header });
	},
];

export async function assertOnChainReleaseParamsMatch(args: {
	validator: ReturnType<typeof fsPaymentValidatorAt>;
	rule: SettlementRuleRegistrationInput;
	header: OnChainRuleHeader;
}): Promise<void> {
	for (const verify of RELEASE_PARAM_VERIFIERS) {
		await verify(args);
	}
}
