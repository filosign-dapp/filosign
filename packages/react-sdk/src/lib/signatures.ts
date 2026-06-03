import type { FilosignContracts } from "@filosign/contracts";
import { computeCidIdentifier, eip712signature } from "@filosign/contracts";
import type { Hex } from "viem";
import { withRegistryWalletActionLock } from "./registry-wallet-action-lock";
import type { FilosignWallet } from "./wallet";

export async function signAmendSigner(args: {
	wallet: FilosignWallet;
	contracts: FilosignContracts;
	pieceCid: string;
	oldCommitment: Hex;
	newCommitment: Hex;
	timestamp: number;
	/** Defaults to connected wallet (sender or org controller). */
	recaller?: `0x${string}`;
}): Promise<Hex> {
	const recaller = args.recaller ?? args.wallet.account.address;
	const cidIdentifier = computeCidIdentifier(args.pieceCid);

	return withRegistryWalletActionLock(recaller, () =>
		eip712signature(args.contracts, "FSEnvelopeRegistry", {
			types: {
				AmendSigner: [
					{ name: "cidIdentifier", type: "bytes32" },
					{ name: "recaller", type: "address" },
					{ name: "oldCommitment", type: "bytes32" },
					{ name: "newCommitment", type: "bytes32" },
					{ name: "timestamp", type: "uint256" },
				],
			},
			primaryType: "AmendSigner",
			message: {
				cidIdentifier,
				recaller,
				oldCommitment: args.oldCommitment,
				newCommitment: args.newCommitment,
				timestamp: BigInt(args.timestamp),
			},
		}),
	);
}

export async function signRecallEnvelope(args: {
	wallet: FilosignWallet;
	contracts: FilosignContracts;
	pieceCid: string;
	orgIdCommitment: Hex;
	timestamp: number;
	recaller?: `0x${string}`;
}): Promise<Hex> {
	const recaller = args.recaller ?? args.wallet.account.address;
	const cidIdentifier = computeCidIdentifier(args.pieceCid);

	return withRegistryWalletActionLock(recaller, () =>
		eip712signature(args.contracts, "FSEnvelopeRegistry", {
			types: {
				RecallEnvelope: [
					{ name: "cidIdentifier", type: "bytes32" },
					{ name: "recaller", type: "address" },
					{ name: "orgIdCommitment", type: "bytes32" },
					{ name: "timestamp", type: "uint256" },
				],
			},
			primaryType: "RecallEnvelope",
			message: {
				cidIdentifier,
				recaller,
				orgIdCommitment: args.orgIdCommitment,
				timestamp: BigInt(args.timestamp),
			},
		}),
	);
}

export async function signLinkOrgWallet(args: {
	wallet: FilosignWallet;
	contracts: FilosignContracts;
	organizationId: string;
	timestamp: number;
}): Promise<Hex> {
	return args.wallet.signTypedData({
		account: args.wallet.account,
		domain: {
			name: "FilosignOrgWallet",
			version: "1",
			chainId: args.contracts.$client.chain.id,
			verifyingContract: args.contracts.FSEnvelopeRegistry.address,
		},
		types: {
			LinkOrgWallet: [
				{ name: "organizationId", type: "string" },
				{ name: "wallet", type: "address" },
				{ name: "timestamp", type: "uint256" },
			],
		},
		primaryType: "LinkOrgWallet",
		message: {
			organizationId: args.organizationId,
			wallet: args.wallet.account.address,
			timestamp: BigInt(args.timestamp),
		},
	});
}
