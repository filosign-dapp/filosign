import { computeCidIdentifier } from "@filosign/contracts";
import type {
	PaymentReleaseType,
	PaymentRuleRegistrationInput,
} from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import type { Address, Hex } from "viem";
import { getAddress } from "viem";
import { evmClient, fsContracts } from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

const RELEASE_TYPE_UINT: Record<PaymentReleaseType, number> = {
	all_signed: 0,
	specific_signer: 1,
	at_least_n: 2,
};

async function assertTxSucceeded(hash: Hex, label: string) {
	const res = await tryCatch(evmClient.getTransactionReceipt({ hash }));
	if (res.error || !res.data || res.data.status !== "success") {
		throw new ORPCError("BAD_REQUEST", {
			message: `${label} transaction not found or failed on-chain`,
		});
	}
}

/** Ensures indexed payment rules exist on-chain for this sender and document. */
export async function assertPaymentRulesVerifiedOnChain(
	sender: Address,
	pieceCid: string,
	rules: PaymentRuleRegistrationInput[],
) {
	if (rules.length === 0) return;

	const validator = fsContracts.FSPaymentValidator;
	if (!validator) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				"FSPaymentValidator is not deployed on this chain. Run contracts deploy/migrate first.",
		});
	}

	const expectedCid = computeCidIdentifier(pieceCid);
	const senderAddr = getAddress(sender);

	for (const rule of rules) {
		if (rule.cidIdentifier.toLowerCase() !== expectedCid.toLowerCase()) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Payment rule cidIdentifier does not match document",
			});
		}

		const ruleId = BigInt(rule.onChainRuleId);
		const readRes = await tryCatch(validator.read.rules([ruleId]));
		if (readRes.error || !readRes.data) {
			throw new ORPCError("BAD_REQUEST", {
				message: `Payment rule ${rule.onChainRuleId} not found on-chain`,
			});
		}

		const [
			payer,
			recipient,
			token,
			amount,
			cidId,
			releaseType,
			specificCommitment,
			thresholdN,
			executed,
		] = readRes.data;

		if (executed) {
			throw new ORPCError("BAD_REQUEST", {
				message: `Payment rule ${rule.onChainRuleId} is already executed`,
			});
		}
		if (getAddress(payer) !== senderAddr) {
			throw new ORPCError("BAD_REQUEST", {
				message: "On-chain payer does not match sender wallet",
			});
		}
		if (getAddress(recipient) !== getAddress(rule.recipientWallet)) {
			throw new ORPCError("BAD_REQUEST", {
				message: "On-chain recipient does not match submitted payment rule",
			});
		}
		if (getAddress(token) !== getAddress(rule.tokenAddress)) {
			throw new ORPCError("BAD_REQUEST", {
				message: "On-chain token does not match submitted payment rule",
			});
		}
		if (amount !== BigInt(rule.amount)) {
			throw new ORPCError("BAD_REQUEST", {
				message: "On-chain amount does not match submitted payment rule",
			});
		}
		if (cidId.toLowerCase() !== expectedCid.toLowerCase()) {
			throw new ORPCError("BAD_REQUEST", {
				message: "On-chain cidId does not match document",
			});
		}
		if (Number(releaseType) !== RELEASE_TYPE_UINT[rule.releaseType]) {
			throw new ORPCError("BAD_REQUEST", {
				message: "On-chain release type does not match submitted payment rule",
			});
		}

		if (
			rule.releaseType === "specific_signer" &&
			rule.releaseParams.releaseType === "specific_signer"
		) {
			if (
				specificCommitment.toLowerCase() !==
				rule.releaseParams.signerEmailCommitment.toLowerCase()
			) {
				throw new ORPCError("BAD_REQUEST", {
					message: "On-chain signer commitment does not match payment rule",
				});
			}
		}

		if (
			rule.releaseType === "at_least_n" &&
			rule.releaseParams.releaseType === "at_least_n"
		) {
			if (Number(thresholdN) !== rule.releaseParams.thresholdN) {
				throw new ORPCError("BAD_REQUEST", {
					message: "On-chain threshold does not match payment rule",
				});
			}
		}

		await assertTxSucceeded(rule.registerRuleTxHash, "registerRule");
		await assertTxSucceeded(rule.approveTxHash, "approve");
	}
}
