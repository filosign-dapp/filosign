import { safeTransactionServiceUrlForChainId } from "@filosign/shared";
import {
	type Address,
	createPublicClient,
	type Hex,
	hashTypedData,
	isHex,
	verifyTypedData,
} from "viem";
import config from "@/config";
import {
	createServerChainRpcTransport,
	serverChainRpcTransportArgs,
} from "@/lib/platform/chain-rpc";
import { fsContracts } from "@/lib/platform/evm";

export const FILOSIGN_ORG_WALLET_DOMAIN_NAME = "FilosignOrgWallet" as const;

const LINK_ORG_WALLET_TYPES = {
	LinkOrgWallet: [
		{ name: "organizationId", type: "string" },
		{ name: "wallet", type: "address" },
		{ name: "timestamp", type: "uint256" },
	],
} as const;

const EIP1271_MAGIC_VALUE = "0x1626ba7e";
const SAFE_ABI = [
	{
		type: "function",
		name: "isValidSignature",
		stateMutability: "view",
		inputs: [
			{ name: "_hash", type: "bytes32" },
			{ name: "_signature", type: "bytes" },
		],
		outputs: [{ name: "", type: "bytes4" }],
	},
	{
		type: "function",
		name: "getThreshold",
		stateMutability: "view",
		inputs: [],
		outputs: [{ name: "", type: "uint256" }],
	},
	{
		type: "function",
		name: "getMessageHash",
		stateMutability: "view",
		inputs: [{ name: "message", type: "bytes" }],
		outputs: [{ name: "", type: "bytes32" }],
	},
] as const;

const { transport } = createServerChainRpcTransport(
	serverChainRpcTransportArgs(),
);
const safeReadClient = createPublicClient({
	chain: config.runtimeChain,
	transport,
});

type LinkTypedDataMessage = {
	organizationId: string;
	wallet: Address;
	timestamp: bigint;
};

function linkTypedDataMessage(args: {
	organizationId: string;
	walletAddress: Address;
	timestamp: number;
}): LinkTypedDataMessage {
	return {
		organizationId: args.organizationId,
		wallet: args.walletAddress,
		timestamp: BigInt(args.timestamp),
	};
}

function linkTypedDataHash(args: {
	organizationId: string;
	walletAddress: Address;
	timestamp: number;
}): Hex {
	return hashTypedData({
		domain: {
			name: FILOSIGN_ORG_WALLET_DOMAIN_NAME,
			version: "1",
			chainId: BigInt(config.runtimeChain.id),
			verifyingContract: fsContracts.FSEnvelopeRegistry.address,
		},
		types: LINK_ORG_WALLET_TYPES,
		primaryType: "LinkOrgWallet",
		message: linkTypedDataMessage(args),
	});
}

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
		message: linkTypedDataMessage(args),
		signature: args.signature,
	});
}

export async function validateSafeLinkOrgWalletSignature(args: {
	walletAddress: Address;
	organizationId: string;
	timestamp: number;
	signature?: Hex;
	safeMessageHash?: Hex;
}): Promise<boolean> {
	const typedDataHash = linkTypedDataHash(args);
	if (args.signature && isHex(args.signature)) {
		const result = await safeReadClient.readContract({
			address: args.walletAddress,
			abi: SAFE_ABI,
			functionName: "isValidSignature",
			args: [typedDataHash, args.signature],
		});
		if (result.toLowerCase() === EIP1271_MAGIC_VALUE) {
			return true;
		}
	}

	if (!args.safeMessageHash || !isHex(args.safeMessageHash)) {
		return false;
	}

	const serviceBase = safeTransactionServiceUrlForChainId(
		config.runtimeChain.id,
	);
	if (!serviceBase) return false;

	const threshold = await safeReadClient.readContract({
		address: args.walletAddress,
		abi: SAFE_ABI,
		functionName: "getThreshold",
		args: [],
	});

	// Verify the canonical Safe message hash from contract read, not local reimplementation.
	const expectedSafeMessageHash = await safeReadClient.readContract({
		address: args.walletAddress,
		abi: SAFE_ABI,
		functionName: "getMessageHash",
		args: [typedDataHash],
	});
	if (
		expectedSafeMessageHash.toLowerCase() !== args.safeMessageHash.toLowerCase()
	) {
		return false;
	}

	const url = `${serviceBase}/api/v1/messages/${args.safeMessageHash}/`;
	const res = await fetch(url);
	if (!res.ok) return false;
	const data = (await res.json()) as {
		confirmations?: unknown[];
		confirmationsSubmitted?: number;
		preparedSignature?: string;
	};
	const confirmationsCount =
		typeof data.confirmationsSubmitted === "number"
			? data.confirmationsSubmitted
			: Array.isArray(data.confirmations)
				? data.confirmations.length
				: 0;
	if (confirmationsCount < Number(threshold)) return false;

	if (!data.preparedSignature || !isHex(data.preparedSignature)) return false;
	const result = await safeReadClient.readContract({
		address: args.walletAddress,
		abi: SAFE_ABI,
		functionName: "isValidSignature",
		args: [typedDataHash, data.preparedSignature as Hex],
	});
	return result.toLowerCase() === EIP1271_MAGIC_VALUE;
}
