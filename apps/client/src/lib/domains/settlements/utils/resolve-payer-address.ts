import { getAddress, isAddress } from "viem";

function normalizePayerAddress(
	value: string | null | undefined,
): `0x${string}` | undefined {
	if (!value || !isAddress(value)) return undefined;
	return getAddress(value) as `0x${string}`;
}

export function resolvePayoutPayerAddress(args: {
	payoutPayerSource?: "sender" | "org_wallet";
	connectedWalletAddress?: string;
	orgWalletAddress?: string | null;
}): `0x${string}` | undefined {
	if (args.payoutPayerSource === "org_wallet") {
		return normalizePayerAddress(args.orgWalletAddress);
	}
	return normalizePayerAddress(args.connectedWalletAddress);
}
