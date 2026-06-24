import { throwAppError } from "@filosign/errors/server";
import type { SettlementRuleRegistrationInput } from "@filosign/shared";
import { getAddress, isAddress } from "viem";

function norm(addr: string) {
	return getAddress(addr).toLowerCase();
}

export function assertSettlementLegRecipientAllowlisted(args: {
	leg: SettlementRuleRegistrationInput["legs"][number];
	allowed: Set<string>;
	orgWallet: `0x${string}` | null;
	participantWallets: `0x${string}`[];
}): void {
	if (args.leg.recipientSource === "external") {
		if (!isAddress(args.leg.recipientWallet)) {
			throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
				params: {
					reason: "External payout recipient must be a valid wallet address",
				},
			});
		}
		return;
	}

	const recipient = norm(args.leg.recipientWallet);

	if (!args.allowed.has(recipient)) {
		throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
			params: {
				reason:
					"Settlement recipient must be an envelope participant or the organization payout wallet",
			},
		});
	}

	if (args.leg.recipientSource === "org_wallet") {
		if (!args.orgWallet || recipient !== norm(args.orgWallet)) {
			throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
				params: {
					reason: "Organization payout wallet is not linked or does not match",
				},
			});
		}
		return;
	}

	if (
		args.leg.recipientSource === "signer" ||
		args.leg.recipientSource === "viewer"
	) {
		if (!args.participantWallets.some((w) => norm(w) === recipient)) {
			throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
				params: {
					reason: "Settlement recipient must be on this envelope",
				},
			});
		}
	}
}
