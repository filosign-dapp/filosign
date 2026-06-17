import type { EntitlementsSnapshot } from "@filosign/react/billing";
import { canUseWorkspaceTreasury } from "@filosign/react/files";
import { getAddress, isAddress } from "viem";

function normalizeAddress(
	value: string | null | undefined,
): `0x${string}` | undefined {
	if (!value || !isAddress(value)) return undefined;
	return getAddress(value) as `0x${string}`;
}

export function resolveTreasuryPayerOffer(args: {
	entitlements: EntitlementsSnapshot | undefined;
	orgWalletAddress: string | null | undefined;
	connectedWalletAddress: string | null | undefined;
}): {
	canOfferTreasuryPayer: boolean;
	orgWalletAddress: `0x${string}` | undefined;
	connectedWalletAddress: `0x${string}` | undefined;
} {
	const orgWalletAddress = normalizeAddress(args.orgWalletAddress);
	const connectedWalletAddress = normalizeAddress(args.connectedWalletAddress);
	const canOfferTreasuryPayer =
		canUseWorkspaceTreasury(args.entitlements) &&
		orgWalletAddress !== undefined &&
		connectedWalletAddress !== undefined &&
		orgWalletAddress !== connectedWalletAddress;

	return {
		canOfferTreasuryPayer,
		orgWalletAddress,
		connectedWalletAddress,
	};
}

export function defaultPayoutPayerSource(args: {
	canOfferTreasuryPayer: boolean;
	payoutPayerUserOverride?: boolean;
	currentSource?: "sender" | "org_wallet";
}): "sender" | "org_wallet" {
	if (!args.canOfferTreasuryPayer) return "sender";
	if (args.payoutPayerUserOverride) {
		return args.currentSource === "org_wallet" ? "org_wallet" : "sender";
	}
	return "org_wallet";
}
