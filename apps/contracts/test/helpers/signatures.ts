import type { Account, Address, Hex, WalletClient } from "viem";
import { encodePacked, keccak256, toBytes } from "viem";

const ZERO_BYTES20 = "0x0000000000000000000000000000000000000000" as const;

export const SALT_PIN = `0x${"01".repeat(16)}` as Hex;
export const SALT_SEED = `0x${"02".repeat(16)}` as Hex;
export const SALT_CHALLENGE = `0x${"03".repeat(16)}` as Hex;
export const COMMIT_KYBER = `0x${"04".repeat(20)}` as Hex;
export const COMMIT_DILITHIUM = `0x${"05".repeat(20)}` as Hex;

export function hashCommitments(commitments: readonly Hex[]): Hex {
	if (commitments.length === 0) {
		return keccak256(new Uint8Array(0));
	}
	return keccak256(
		encodePacked(
			commitments.map(() => "bytes32" as const),
			commitments,
		),
	);
}

export async function signRegisterKeygen(
	wallet: WalletClient,
	fileRegistryAddress: Address,
	chainId: number,
): Promise<Hex> {
	const account = wallet.account as Account;
	return wallet.signTypedData({
		account,
		domain: {
			name: "FilosignRegistration",
			version: "1",
			chainId,
			verifyingContract: fileRegistryAddress,
		},
		types: {
			RegisterKeygenData: [
				{ name: "from", type: "address" },
				{ name: "salt_pin", type: "bytes16" },
				{ name: "salt_seed", type: "bytes16" },
				{ name: "salt_challenge", type: "bytes16" },
				{ name: "commitment_kyber_pk", type: "bytes20" },
				{ name: "commitment_dilithium_pk", type: "bytes20" },
			],
		},
		primaryType: "RegisterKeygenData",
		message: {
			from: account.address,
			salt_pin: SALT_PIN,
			salt_seed: SALT_SEED,
			salt_challenge: SALT_CHALLENGE,
			commitment_kyber_pk: COMMIT_KYBER,
			commitment_dilithium_pk: COMMIT_DILITHIUM,
		},
	});
}

export async function signRegisterFile(args: {
	wallet: WalletClient;
	fileRegistryAddress: Address;
	chainId: number;
	pieceCid: string;
	requiredCommitments: Hex[];
	optionalCommitments?: Hex[];
	signersCommitment: Hex;
	viewersCommitment?: Hex;
	placementCommitment: Hex;
	senderEmailCommitment: Hex;
	senderPrivySubjectCommitment: Hex;
	orgIdCommitment?: Hex;
	routingMode?: number;
	routingOrder?: Hex[];
	quorumN?: number;
	quorumSet?: Hex[];
	timestamp: bigint;
	nonce: bigint;
}): Promise<Hex> {
	const account = args.wallet.account as Account;
	const cidId = keccak256(toBytes(args.pieceCid));
	const optionalCommitments = args.optionalCommitments ?? [];
	const viewersCommitment = args.viewersCommitment ?? ZERO_BYTES20;
	const orgIdCommitment =
		args.orgIdCommitment ??
		("0x0000000000000000000000000000000000000000000000000000000000000000" as Hex);
	const routingMode = args.routingMode ?? 0;
	const routingOrder = args.routingOrder ?? [];
	const quorumN = args.quorumN ?? 0;
	const quorumSet = args.quorumSet ?? [];

	return args.wallet.signTypedData({
		account,
		domain: {
			name: "FSFileRegistry",
			version: "2",
			chainId: args.chainId,
			verifyingContract: args.fileRegistryAddress,
		},
		types: {
			RegisterFile: [
				{ name: "cidIdentifier", type: "bytes32" },
				{ name: "sender", type: "address" },
				{ name: "signersCommitment", type: "bytes20" },
				{ name: "viewersCommitment", type: "bytes20" },
				{ name: "placementCommitment", type: "bytes32" },
				{ name: "senderEmailCommitment", type: "bytes32" },
				{ name: "senderPrivySubjectCommitment", type: "bytes32" },
				{ name: "orgIdCommitment", type: "bytes32" },
				{ name: "requiredCommitmentsHash", type: "bytes32" },
				{ name: "optionalCommitmentsHash", type: "bytes32" },
				{ name: "routingMode", type: "uint8" },
				{ name: "routingOrderHash", type: "bytes32" },
				{ name: "quorumN", type: "uint8" },
				{ name: "quorumSetHash", type: "bytes32" },
				{ name: "timestamp", type: "uint256" },
				{ name: "nonce", type: "uint256" },
			],
		},
		primaryType: "RegisterFile",
		message: {
			cidIdentifier: cidId,
			sender: account.address,
			signersCommitment: args.signersCommitment,
			viewersCommitment,
			placementCommitment: args.placementCommitment,
			senderEmailCommitment: args.senderEmailCommitment,
			senderPrivySubjectCommitment: args.senderPrivySubjectCommitment,
			orgIdCommitment,
			requiredCommitmentsHash: hashCommitments(args.requiredCommitments),
			optionalCommitmentsHash: hashCommitments(optionalCommitments),
			routingMode,
			routingOrderHash: hashCommitments(routingOrder),
			quorumN,
			quorumSetHash: hashCommitments(quorumSet),
			timestamp: args.timestamp,
			nonce: args.nonce,
		},
	});
}

export async function signAmendSigner(args: {
	wallet: WalletClient;
	fileRegistryAddress: Address;
	chainId: number;
	pieceCid: string;
	oldCommitment: Hex;
	newCommitment: Hex;
	timestamp: bigint;
	nonce: bigint;
}): Promise<Hex> {
	const account = args.wallet.account as Account;
	const cidId = keccak256(toBytes(args.pieceCid));

	return args.wallet.signTypedData({
		account,
		domain: {
			name: "FSFileRegistry",
			version: "2",
			chainId: args.chainId,
			verifyingContract: args.fileRegistryAddress,
		},
		types: {
			AmendSigner: [
				{ name: "cidIdentifier", type: "bytes32" },
				{ name: "sender", type: "address" },
				{ name: "oldCommitment", type: "bytes32" },
				{ name: "newCommitment", type: "bytes32" },
				{ name: "timestamp", type: "uint256" },
				{ name: "nonce", type: "uint256" },
			],
		},
		primaryType: "AmendSigner",
		message: {
			cidIdentifier: cidId,
			sender: account.address,
			oldCommitment: args.oldCommitment,
			newCommitment: args.newCommitment,
			timestamp: args.timestamp,
			nonce: args.nonce,
		},
	});
}

export async function signRegisterFileSignature(args: {
	wallet: WalletClient;
	fileRegistryAddress: Address;
	chainId: number;
	pieceCid: string;
	sender: Address;
	signerEmailCommitment: Hex;
	privySubjectCommitment: Hex;
	dl3SignatureCommitment: Hex;
	completionsRoot: Hex;
	leafSchemaVersion: number;
	timestamp: bigint;
	nonce: bigint;
}): Promise<Hex> {
	const account = args.wallet.account as Account;
	const cidId = keccak256(toBytes(args.pieceCid));

	return args.wallet.signTypedData({
		account,
		domain: {
			name: "FSFileRegistry",
			version: "2",
			chainId: args.chainId,
			verifyingContract: args.fileRegistryAddress,
		},
		types: {
			SignFile: [
				{ name: "cidIdentifier", type: "bytes32" },
				{ name: "sender", type: "address" },
				{ name: "signerWallet", type: "address" },
				{ name: "signerEmailCommitment", type: "bytes32" },
				{ name: "privySubjectCommitment", type: "bytes32" },
				{ name: "dl3SignatureCommitment", type: "bytes20" },
				{ name: "completionsRoot", type: "bytes32" },
				{ name: "leafSchemaVersion", type: "uint8" },
				{ name: "timestamp", type: "uint256" },
				{ name: "nonce", type: "uint256" },
			],
		},
		primaryType: "SignFile",
		message: {
			cidIdentifier: cidId,
			sender: args.sender,
			signerWallet: account.address,
			signerEmailCommitment: args.signerEmailCommitment,
			privySubjectCommitment: args.privySubjectCommitment,
			dl3SignatureCommitment: args.dl3SignatureCommitment,
			completionsRoot: args.completionsRoot,
			leafSchemaVersion: args.leafSchemaVersion,
			timestamp: args.timestamp,
			nonce: args.nonce,
		},
	});
}

/** OZ `ERC20Permit` for MockUSDCToken (`name`: Mock USD Coin). */
export async function signMockUsdcPermit(args: {
	wallet: WalletClient;
	tokenAddress: Address;
	chainId: number;
	owner: Address;
	spender: Address;
	value: bigint;
	nonce: bigint;
	deadline: bigint;
}): Promise<{ v: number; r: Hex; s: Hex }> {
	const sig = await args.wallet.signTypedData({
		account: args.wallet.account as Account,
		domain: {
			name: "Mock USD Coin",
			version: "1",
			chainId: args.chainId,
			verifyingContract: args.tokenAddress,
		},
		types: {
			Permit: [
				{ name: "owner", type: "address" },
				{ name: "spender", type: "address" },
				{ name: "value", type: "uint256" },
				{ name: "nonce", type: "uint256" },
				{ name: "deadline", type: "uint256" },
			],
		},
		primaryType: "Permit",
		message: {
			owner: args.owner,
			spender: args.spender,
			value: args.value,
			nonce: args.nonce,
			deadline: args.deadline,
		},
	});
	const r = `0x${sig.slice(2, 66)}` as Hex;
	const s = `0x${sig.slice(66, 130)}` as Hex;
	let v = Number.parseInt(sig.slice(130, 132), 16);
	if (v < 27) v += 27;
	return { v, r, s };
}

export function mergeSortedCommitments(
	required: readonly Hex[],
	optional: readonly Hex[],
): Hex[] {
	const merged: Hex[] = [];
	let i = 0;
	let j = 0;
	while (i < required.length && j < optional.length) {
		const req = required[i];
		const opt = optional[j];
		if (req === undefined || opt === undefined) break;
		if (req < opt) {
			merged.push(req);
			i++;
		} else {
			merged.push(opt);
			j++;
		}
	}
	while (i < required.length) {
		const req = required[i];
		if (req === undefined) break;
		merged.push(req);
		i++;
	}
	while (j < optional.length) {
		const opt = optional[j];
		if (opt === undefined) break;
		merged.push(opt);
		j++;
	}
	return merged;
}
