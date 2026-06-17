import type { LinkOrgWalletProof } from "@filosign/react/orgs";
import { linkOrgWalletTypedData } from "@filosign/react/orgs";
import { type Address, type Hex, hashTypedData, isHex } from "viem";
import { treasuryChainId } from "@/src/lib/web3/treasury/chain";
import { treasuryEip1193Provider } from "@/src/lib/web3/treasury/provider";
import {
	createTreasuryPublicClient,
	detectTreasuryWalletKind,
	readSafeThreshold,
	treasurySafeServiceAvailable,
} from "@/src/lib/web3/treasury/safe-detect";
import {
	createSafeApiKit,
	createSafeProtocolKit,
	pollSafeMessageConfirmations,
	readSafeMessageHashFromContract,
} from "@/src/lib/web3/treasury/safe-kit";
import type { TreasuryWalletSession } from "@/src/lib/web3/treasury/session";

const EIP1271_MAGIC_VALUE = "0x1626ba7e";

export type LinkOrgWalletWithTreasuryArgs = {
	session: TreasuryWalletSession;
	organizationId: string;
	verifyingContract: Address;
	timestamp: number;
	onPollingSafe?: () => void;
};

function buildLinkTypedDataHash(args: {
	organizationId: string;
	wallet: Address;
	timestamp: number;
	verifyingContract: Address;
}): Hex {
	const typedData = linkOrgWalletTypedData({
		organizationId: args.organizationId,
		wallet: args.wallet,
		timestamp: args.timestamp,
		chainId: treasuryChainId(),
		verifyingContract: args.verifyingContract,
	});
	return hashTypedData({
		domain: typedData.domain,
		types: typedData.types,
		primaryType: "LinkOrgWallet",
		message: typedData.message,
	});
}

async function trySafeEip1271Proof(args: {
	safeAddress: Address;
	typedDataHash: Hex;
	signature: Hex;
}): Promise<boolean> {
	const client = createTreasuryPublicClient();
	try {
		const result = await client.readContract({
			address: args.safeAddress,
			abi: [
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
			],
			functionName: "isValidSignature",
			args: [args.typedDataHash, args.signature],
		});
		return result.toLowerCase() === EIP1271_MAGIC_VALUE;
	} catch {
		return false;
	}
}

async function linkEoaWallet(
	args: LinkOrgWalletWithTreasuryArgs,
): Promise<LinkOrgWalletProof> {
	const signature = await args.session.signLinkOrgWallet({
		organizationId: args.organizationId,
		timestamp: args.timestamp,
		verifyingContract: args.verifyingContract,
	});
	return { proofType: "eoa", signature };
}

async function linkSafeWallet(
	args: LinkOrgWalletWithTreasuryArgs,
): Promise<LinkOrgWalletProof> {
	if (!treasurySafeServiceAvailable(treasuryChainId())) {
		throw new Error(
			"Safe treasury linking requires a network with Safe Transaction Service support.",
		);
	}

	const provider = await treasuryEip1193Provider();
	const typedDataHash = buildLinkTypedDataHash({
		organizationId: args.organizationId,
		wallet: args.session.address,
		timestamp: args.timestamp,
		verifyingContract: args.verifyingContract,
	});

	const protocolKit = await createSafeProtocolKit({
		safeAddress: args.session.address,
		provider,
	});

	const safeMessage = protocolKit.createMessage(typedDataHash);
	const signedMessage = await protocolKit.signMessage(safeMessage);
	const signature = signedMessage.signatures.values().next().value?.data;
	if (!signature || !isHex(signature)) {
		throw new Error("Failed to sign treasury link message.");
	}

	if (
		await trySafeEip1271Proof({
			safeAddress: args.session.address,
			typedDataHash,
			signature,
		})
	) {
		return { proofType: "safe_eip1271", signature };
	}

	const publicClient = createTreasuryPublicClient();
	const safeMessageHash = await readSafeMessageHashFromContract({
		publicClient,
		safeAddress: args.session.address,
		typedDataHash,
	});

	const apiKit = await createSafeApiKit();
	await apiKit.addMessage(args.session.address, {
		message: typedDataHash,
		signature,
	});

	args.onPollingSafe?.();
	const threshold = await readSafeThreshold(publicClient, args.session.address);
	if (!threshold) {
		throw new Error("Could not read Safe signature threshold.");
	}

	await pollSafeMessageConfirmations({
		messageHash: safeMessageHash,
		threshold,
	});

	return {
		proofType: "safe_service",
		signature,
		safeMessageHash,
	};
}

export async function linkOrgWalletWithTreasurySession(
	args: LinkOrgWalletWithTreasuryArgs,
): Promise<LinkOrgWalletProof> {
	const client = createTreasuryPublicClient();
	const kind = await detectTreasuryWalletKind(args.session.address, client);
	if (kind === "eoa") {
		return linkEoaWallet(args);
	}
	return linkSafeWallet(args);
}
