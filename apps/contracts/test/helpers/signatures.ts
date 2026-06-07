import type { Account, Address, Hex, WalletClient } from "viem";
import { encodePacked, keccak256, toBytes } from "viem";

const ZERO_BYTES20 = "0x0000000000000000000000000000000000000000" as const;
/** FSEnvelopeRegistry EIP-712 domain version — must match constructor. */
export const REGISTRY_EIP712_VERSION = "2" as const;

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
	envelopeRegistryAddress: Address,
	chainId: number,
): Promise<Hex> {
	const account = wallet.account as Account;
	return wallet.signTypedData({
		account,
		domain: {
			name: "FilosignRegistration",
			version: "1",
			chainId,
			verifyingContract: envelopeRegistryAddress,
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

export async function signRegisterEnvelope(args: {
	wallet: WalletClient;
	envelopeRegistryAddress: Address;
	chainId: number;
	pieceCid: string;
	requiredCommitments: Hex[];
	optionalCommitments?: Hex[];
	signersCommitment: Hex;
	viewersCommitment?: Hex;
	placementCommitment: Hex;
	documentSha256: Hex;
	senderEmailCommitment: Hex;
	senderAuthSubjectCommitment: Hex;
	orgIdCommitment?: Hex;
	routingMode?: number;
	routingOrder?: Hex[];
	quorumN?: number;
	quorumSet?: Hex[];
	timestamp: bigint;
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
			name: "FSEnvelopeRegistry",
			version: REGISTRY_EIP712_VERSION,
			chainId: args.chainId,
			verifyingContract: args.envelopeRegistryAddress,
		},
		types: {
			RegisterEnvelope: [
				{ name: "cidIdentifier", type: "bytes32" },
				{ name: "sender", type: "address" },
				{ name: "signersCommitment", type: "bytes20" },
				{ name: "viewersCommitment", type: "bytes20" },
				{ name: "placementCommitment", type: "bytes32" },
				{ name: "documentSha256", type: "bytes32" },
				{ name: "senderEmailCommitment", type: "bytes32" },
				{ name: "senderAuthSubjectCommitment", type: "bytes32" },
				{ name: "orgIdCommitment", type: "bytes32" },
				{ name: "requiredCommitmentsHash", type: "bytes32" },
				{ name: "optionalCommitmentsHash", type: "bytes32" },
				{ name: "routingMode", type: "uint8" },
				{ name: "routingOrderHash", type: "bytes32" },
				{ name: "quorumN", type: "uint8" },
				{ name: "quorumSetHash", type: "bytes32" },
				{ name: "timestamp", type: "uint256" },
			],
		},
		primaryType: "RegisterEnvelope",
		message: {
			cidIdentifier: cidId,
			sender: account.address,
			signersCommitment: args.signersCommitment,
			viewersCommitment,
			placementCommitment: args.placementCommitment,
			documentSha256: args.documentSha256,
			senderEmailCommitment: args.senderEmailCommitment,
			senderAuthSubjectCommitment: args.senderAuthSubjectCommitment,
			orgIdCommitment,
			requiredCommitmentsHash: hashCommitments(args.requiredCommitments),
			optionalCommitmentsHash: hashCommitments(optionalCommitments),
			routingMode,
			routingOrderHash: hashCommitments(routingOrder),
			quorumN,
			quorumSetHash: hashCommitments(quorumSet),
			timestamp: args.timestamp,
		},
	});
}

export async function signProposeSignerReplacement(args: {
	wallet: WalletClient;
	envelopeRegistryAddress: Address;
	chainId: number;
	pieceCid: string;
	oldCommitment: Hex;
	newCommitment: Hex;
	signersCommitmentAfter: Hex;
	timestamp: bigint;
	recaller?: Address;
}): Promise<Hex> {
	const account = args.wallet.account as Account;
	const cidId = keccak256(toBytes(args.pieceCid));
	const recaller = args.recaller ?? account.address;

	return args.wallet.signTypedData({
		account,
		domain: {
			name: "FSEnvelopeRegistry",
			version: REGISTRY_EIP712_VERSION,
			chainId: args.chainId,
			verifyingContract: args.envelopeRegistryAddress,
		},
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
			cidIdentifier: cidId,
			recaller,
			oldCommitment: args.oldCommitment,
			newCommitment: args.newCommitment,
			signersCommitmentAfter: args.signersCommitmentAfter,
			timestamp: args.timestamp,
		},
	});
}

export async function signCancelSignerReplacement(args: {
	wallet: WalletClient;
	envelopeRegistryAddress: Address;
	chainId: number;
	pieceCid: string;
	timestamp: bigint;
	recaller?: Address;
}): Promise<Hex> {
	const account = args.wallet.account as Account;
	const cidId = keccak256(toBytes(args.pieceCid));
	const recaller = args.recaller ?? account.address;

	return args.wallet.signTypedData({
		account,
		domain: {
			name: "FSEnvelopeRegistry",
			version: REGISTRY_EIP712_VERSION,
			chainId: args.chainId,
			verifyingContract: args.envelopeRegistryAddress,
		},
		types: {
			CancelSignerReplacement: [
				{ name: "cidIdentifier", type: "bytes32" },
				{ name: "recaller", type: "address" },
				{ name: "timestamp", type: "uint256" },
			],
		},
		primaryType: "CancelSignerReplacement",
		message: {
			cidIdentifier: cidId,
			recaller,
			timestamp: args.timestamp,
		},
	});
}

export async function signRecallEnvelope(args: {
	wallet: WalletClient;
	envelopeRegistryAddress: Address;
	chainId: number;
	pieceCid: string;
	orgIdCommitment: Hex;
	timestamp: bigint;
	recaller?: Address;
}): Promise<Hex> {
	const account = args.wallet.account as Account;
	const cidId = keccak256(toBytes(args.pieceCid));
	const recaller = args.recaller ?? account.address;

	return args.wallet.signTypedData({
		account,
		domain: {
			name: "FSEnvelopeRegistry",
			version: REGISTRY_EIP712_VERSION,
			chainId: args.chainId,
			verifyingContract: args.envelopeRegistryAddress,
		},
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
			cidIdentifier: cidId,
			recaller,
			orgIdCommitment: args.orgIdCommitment,
			timestamp: args.timestamp,
		},
	});
}

export async function signEnvelopeAck(args: {
	wallet: WalletClient;
	envelopeRegistryAddress: Address;
	chainId: number;
	pieceCid: string;
	sender: Address;
	viewerEmailCommitment: Hex;
	authSubjectCommitment: Hex;
	signersCommitment: Hex;
	timestamp: bigint;
}): Promise<Hex> {
	const account = args.wallet.account as Account;
	const cidId = keccak256(toBytes(args.pieceCid));

	return args.wallet.signTypedData({
		account,
		domain: {
			name: "FSEnvelopeRegistry",
			version: REGISTRY_EIP712_VERSION,
			chainId: args.chainId,
			verifyingContract: args.envelopeRegistryAddress,
		},
		types: {
			AckEnvelope: [
				{ name: "cidIdentifier", type: "bytes32" },
				{ name: "sender", type: "address" },
				{ name: "viewerWallet", type: "address" },
				{ name: "viewerEmailCommitment", type: "bytes32" },
				{ name: "authSubjectCommitment", type: "bytes32" },
				{ name: "signersCommitment", type: "bytes20" },
				{ name: "timestamp", type: "uint256" },
			],
		},
		primaryType: "AckEnvelope",
		message: {
			cidIdentifier: cidId,
			sender: args.sender,
			viewerWallet: account.address,
			viewerEmailCommitment: args.viewerEmailCommitment,
			authSubjectCommitment: args.authSubjectCommitment,
			signersCommitment: args.signersCommitment,
			timestamp: args.timestamp,
		},
	});
}

export async function signRegisterEnvelopeSignature(args: {
	wallet: WalletClient;
	envelopeRegistryAddress: Address;
	chainId: number;
	pieceCid: string;
	sender: Address;
	signerEmailCommitment: Hex;
	authSubjectCommitment: Hex;
	dl3SignatureCommitment: Hex;
	completionsRoot: Hex;
	leafSchemaVersion: number;
	signersCommitment: Hex;
	timestamp: bigint;
}): Promise<Hex> {
	const account = args.wallet.account as Account;
	const cidId = keccak256(toBytes(args.pieceCid));

	return args.wallet.signTypedData({
		account,
		domain: {
			name: "FSEnvelopeRegistry",
			version: REGISTRY_EIP712_VERSION,
			chainId: args.chainId,
			verifyingContract: args.envelopeRegistryAddress,
		},
		types: {
			SignEnvelope: [
				{ name: "cidIdentifier", type: "bytes32" },
				{ name: "sender", type: "address" },
				{ name: "signerWallet", type: "address" },
				{ name: "signerEmailCommitment", type: "bytes32" },
				{ name: "authSubjectCommitment", type: "bytes32" },
				{ name: "dl3SignatureCommitment", type: "bytes20" },
				{ name: "completionsRoot", type: "bytes32" },
				{ name: "leafSchemaVersion", type: "uint8" },
				{ name: "signersCommitment", type: "bytes20" },
				{ name: "timestamp", type: "uint256" },
			],
		},
		primaryType: "SignEnvelope",
		message: {
			cidIdentifier: cidId,
			sender: args.sender,
			signerWallet: account.address,
			signerEmailCommitment: args.signerEmailCommitment,
			authSubjectCommitment: args.authSubjectCommitment,
			dl3SignatureCommitment: args.dl3SignatureCommitment,
			completionsRoot: args.completionsRoot,
			leafSchemaVersion: args.leafSchemaVersion,
			signersCommitment: args.signersCommitment,
			timestamp: args.timestamp,
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
