import { type Address, type Hex, isHex, verifyTypedData } from "viem";
import config from "@/config";
import { fsContracts } from "@/lib/platform/evm";

export const FILOSIGN_ORG_WALLET_DOMAIN_NAME = "FilosignOrgWallet" as const;

const LINK_ORG_WALLET_TYPES = {
	LinkOrgWallet: [
		{ name: "organizationId", type: "string" },
		{ name: "wallet", type: "address" },
		{ name: "timestamp", type: "uint256" },
	],
} as const;

export async function validateLinkOrgWalletSignature(args: {
	walletAddress: Address;
	organizationId: string;
	timestamp: number;
	signature: Hex;
}): Promise<boolean> {
	if (!isHex(args.signature)) return false;

	return verifyTypedData({
		address: args.walletAddress,
		domain: {
			name: FILOSIGN_ORG_WALLET_DOMAIN_NAME,
			version: "1",
			chainId: BigInt(config.runtimeChain.id),
			verifyingContract: fsContracts.FSEnvelopeRegistry.address,
		},
		types: LINK_ORG_WALLET_TYPES,
		primaryType: "LinkOrgWallet",
		message: {
			organizationId: args.organizationId,
			wallet: args.walletAddress,
			timestamp: BigInt(args.timestamp),
		},
		signature: args.signature,
	});
}
