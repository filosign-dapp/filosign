import type { PaymentRuleRegistrationInput } from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { getAddress } from "viem";
import db from "@/lib/platform/db";

const { organizations } = db.schema;

function norm(addr: string) {
	return getAddress(addr).toLowerCase();
}

export async function assertPaymentRecipientsAllowlisted(args: {
	participantWallets: `0x${string}`[];
	organizationId?: string;
	rules: PaymentRuleRegistrationInput[];
}) {
	if (args.rules.length === 0) return;

	const allowed = new Set(args.participantWallets.map((w) => norm(w)));

	let orgWallet: `0x${string}` | null = null;
	if (args.organizationId) {
		const [org] = await db
			.select({ orgWalletAddress: organizations.orgWalletAddress })
			.from(organizations)
			.where(eq(organizations.id, args.organizationId))
			.limit(1);

		if (org?.orgWalletAddress) {
			orgWallet = getAddress(org.orgWalletAddress);
			allowed.add(norm(orgWallet));
		}
	}

	for (const rule of args.rules) {
		const recipient = norm(rule.recipientWallet);

		if (!allowed.has(recipient)) {
			throw new ORPCError("BAD_REQUEST", {
				message:
					"Payment recipient must be an envelope participant or the organization payout wallet",
			});
		}

		if (rule.recipientSource === "org_wallet") {
			if (!orgWallet || recipient !== norm(orgWallet)) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Organization payout wallet is not linked or does not match",
				});
			}
			continue;
		}

		if (
			rule.recipientSource === "signer" ||
			rule.recipientSource === "viewer"
		) {
			if (!args.participantWallets.some((w) => norm(w) === recipient)) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Payment recipient must be on this envelope",
				});
			}
		}
	}
}
