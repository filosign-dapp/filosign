import type { FilosignContracts } from "@filosign/contracts";
import { computeCidIdentifier, eip712signature } from "@filosign/contracts";
import type { Address, Hex } from "viem";
import { envelopeRegistryAt } from "./envelope-registry-at";
import { withRegistryWalletActionLock } from "./registry-wallet-action-lock";
import type { FilosignWallet } from "./wallet";

export async function signProposeSignerReplacement(args: {
	wallet: FilosignWallet;
	contracts: FilosignContracts;
	pieceCid: string;
	oldCommitment: Hex;
	newCommitment: Hex;
	signersCommitmentAfter: Hex;
	timestamp: number;
	recaller?: `0x${string}`;
}): Promise<Hex> {
	const recaller = args.recaller ?? args.wallet.account.address;
	const cidIdentifier = computeCidIdentifier(args.pieceCid);

	return withRegistryWalletActionLock(recaller, () =>
		eip712signature(args.contracts, "FSEnvelopeRegistry", {
			types: {
				ProposeSignerReplacement: [
					{ name: "cidIdentifier", type: "bytes32" },
					{ name: "recaller", type: "address" },
					{ name: "oldCommitment", type: "bytes32" },
					{ name: "newCommitment", type: "bytes32" },
					{ name: "signersCommitmentAfter", type: "bytes20" },
					{ name: "timestamp", type: "uint256" },
				],
			},
			primaryType: "ProposeSignerReplacement",
			message: {
				cidIdentifier,
				recaller,
				oldCommitment: args.oldCommitment,
				newCommitment: args.newCommitment,
				signersCommitmentAfter: args.signersCommitmentAfter,
				timestamp: BigInt(args.timestamp),
			},
		}),
	);
}

export async function signCancelSignerReplacement(args: {
	wallet: FilosignWallet;
	contracts: FilosignContracts;
	pieceCid: string;
	timestamp: number;
	recaller?: `0x${string}`;
}): Promise<Hex> {
	const recaller = args.recaller ?? args.wallet.account.address;
	const cidIdentifier = computeCidIdentifier(args.pieceCid);

	return withRegistryWalletActionLock(recaller, () =>
		eip712signature(args.contracts, "FSEnvelopeRegistry", {
			types: {
				CancelSignerReplacement: [
					{ name: "cidIdentifier", type: "bytes32" },
					{ name: "recaller", type: "address" },
					{ name: "timestamp", type: "uint256" },
				],
			},
			primaryType: "CancelSignerReplacement",
			message: {
				cidIdentifier,
				recaller,
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
	registryAddress?: Address | string | null;
	recaller?: `0x${string}`;
}): Promise<Hex> {
	const recaller = args.recaller ?? args.wallet.account.address;
	const cidIdentifier = computeCidIdentifier(args.pieceCid);
	const registry = envelopeRegistryAt(args.contracts, args.registryAddress);

	return withRegistryWalletActionLock(recaller, () =>
		eip712signature(
			args.contracts,
			"FSEnvelopeRegistry",
			{
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
			},
			{ verifyingContract: registry.address },
		),
	);
}

export async function signClearEnvelopeSignatures(args: {
	wallet: FilosignWallet;
	contracts: FilosignContracts;
	pieceCid: string;
	timestamp: number;
	registryAddress?: Address | string | null;
	recaller?: `0x${string}`;
}): Promise<Hex> {
	const recaller = args.recaller ?? args.wallet.account.address;
	const cidIdentifier = computeCidIdentifier(args.pieceCid);
	const registry = envelopeRegistryAt(args.contracts, args.registryAddress);

	return withRegistryWalletActionLock(recaller, () =>
		eip712signature(
			args.contracts,
			"FSEnvelopeRegistry",
			{
				types: {
					ClearEnvelopeSignatures: [
						{ name: "cidIdentifier", type: "bytes32" },
						{ name: "recaller", type: "address" },
						{ name: "timestamp", type: "uint256" },
					],
				},
				primaryType: "ClearEnvelopeSignatures",
				message: {
					cidIdentifier,
					recaller,
					timestamp: BigInt(args.timestamp),
				},
			},
			{ verifyingContract: registry.address },
		),
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
