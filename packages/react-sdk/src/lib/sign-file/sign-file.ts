import type { FilosignContracts } from "@filosign/contracts";
import { computeCidIdentifier, eip712signature } from "@filosign/contracts";
import {
	computeCommitment,
	jsonStringify,
	signatures,
	toHex,
} from "@filosign/crypto-utils";
import {
	completionsMerkleRootV1,
	type FieldCompletionMap,
	fieldCompletionInputMapFromStored,
	hashNormalizedSignerEmail,
	LEAF_SCHEMA_VERSION_V1,
	SETTLEMENT_FEATURE_TERMS_VERSION,
	zPlacementManifest,
} from "@filosign/shared";
import type { InferClientOutputs } from "@orpc/client";
import { getAddress } from "viem";
import type { FilosignRpcQueryUtils } from "../../context/FilosignContext";
import type { AppRouterClient } from "../../orpc/app-router-types";
import { envelopeRegistryAt } from "../envelope-registry-at";
import { withRegistryWalletActionLock } from "../registry-wallet-action-lock";
import { resolveSignerEmailForSigning } from "../resolve-signer-email-for-signing";
import type { FilosignWallet } from "../wallet";

type PieceDetail =
	InferClientOutputs<AppRouterClient>["files"]["piece"]["detail"];

type DilithiumInstance = Parameters<typeof signatures.keyGen>[0]["dl"];

export type SignFileArgs = {
	pieceCid: string;
	completedFieldIds: string[];
	fieldCompletions?: FieldCompletionMap;
	settlementRecipientAck?: {
		termsVersion: string;
		acceptedAt: number;
	};
};

export type SignFileDeps = {
	contracts: FilosignContracts;
	wallet: FilosignWallet;
	rpcQuery: FilosignRpcQueryUtils;
	dilithium: DilithiumInstance;
	profileEmail?: string | null;
	authSubjectCommitment?: string | null;
};

function validateAssignedFields(args: {
	manifest: ReturnType<typeof zPlacementManifest.parse>;
	signerEmail: string;
	completedFieldIds: string[];
}): string[] {
	const assignedIds = args.manifest.fields
		.filter((f) => f.assignedRecipientEmail === args.signerEmail)
		.map((f) => f.id);

	const allowed = new Set(assignedIds);
	for (const id of args.completedFieldIds) {
		if (!allowed.has(id)) {
			throw new Error(
				"completedFieldIds must match manifest fields for signer",
			);
		}
	}

	if (args.completedFieldIds.length === 0) {
		throw new Error("No fields assigned to this signer");
	}

	return args.completedFieldIds;
}

function assertSettlementAck(args: {
	settlementRules: unknown[];
	settlementRecipientAck?: SignFileArgs["settlementRecipientAck"];
}): boolean {
	const needsPayoutAck = args.settlementRules.length > 0;
	if (!needsPayoutAck) return false;

	if (
		!args.settlementRecipientAck ||
		args.settlementRecipientAck.termsVersion !==
			SETTLEMENT_FEATURE_TERMS_VERSION
	) {
		throw new Error(
			"Acknowledge the attached payout disclosure before signing",
		);
	}
	return true;
}

export async function signFileWithSeed(
	deps: SignFileDeps,
	args: SignFileArgs,
	seed: Uint8Array,
	timestamp: number,
): Promise<void> {
	const {
		pieceCid,
		completedFieldIds,
		fieldCompletions,
		settlementRecipientAck,
	} = args;
	const textEncoder = new TextEncoder();

	const fileResponse: PieceDetail = await deps.rpcQuery.files.piece.detail.call(
		{
			pieceCid,
		},
	);

	const {
		sender,
		registryAddress,
		placementCommitment,
		placementManifest: manifestRaw,
	} = fileResponse;
	const registry = envelopeRegistryAt(deps.contracts, registryAddress);

	if (manifestRaw == null) {
		throw new Error(
			"Document manifest unavailable; acknowledge and view the document first",
		);
	}
	const manifest = zPlacementManifest.parse(manifestRaw);
	const signerAddr = getAddress(deps.wallet.account.address);

	const manifestAssignedEmails = [
		...new Set(manifest.fields.map((f) => f.assignedRecipientEmail)),
	];
	const signerEmail = resolveSignerEmailForSigning({
		signerWallet: signerAddr,
		senderWallet: getAddress(sender),
		fileSigners: fileResponse.signers.map((s) => ({
			wallet: getAddress(s.wallet),
			email: s.email,
		})),
		profileEmail: deps.profileEmail,
		manifestAssignedEmails,
	});
	if (!signerEmail) {
		throw new Error(
			"Your Filosign profile must include an email to sign placed fields for this document",
		);
	}
	const signerEmailCommitment = hashNormalizedSignerEmail(signerEmail);

	if (!deps.authSubjectCommitment) {
		throw new Error("Profile missing Auth subject commitment; try re-login.");
	}

	const fieldIds = validateAssignedFields({
		manifest,
		signerEmail,
		completedFieldIds,
	});

	const completionsRoot = completionsMerkleRootV1({
		fieldIds,
		placementCommitment,
		pieceCid,
		signer: signerAddr,
	});

	const cidIdentifier = computeCidIdentifier(pieceCid);
	const reg = await registry.read.envelopeRegistrations([cidIdentifier]);
	const signersCommitment = reg.signersCommitment;

	const dl3SignatureMessage = jsonStringify({
		pieceCid,
		sender,
		signer: deps.wallet.account.address,
		timestamp,
		completionsRoot,
		leafSchemaVersion: LEAF_SCHEMA_VERSION_V1,
	});
	const dl3Keypair = await signatures.keyGen({
		dl: deps.dilithium,
		seed,
	});
	const dl3Signature = await signatures.sign({
		dl: deps.dilithium,
		privateKey: dl3Keypair.privateKey,
		message: textEncoder.encode(dl3SignatureMessage),
	});

	const dl3SignatureCommitment = computeCommitment([toHex(dl3Signature)]);
	const signature = await withRegistryWalletActionLock(
		deps.wallet.account.address,
		() =>
			eip712signature(
				deps.contracts,
				"FSEnvelopeRegistry",
				{
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
						cidIdentifier,
						sender,
						signerWallet: deps.wallet.account.address,
						signerEmailCommitment,
						authSubjectCommitment: deps.authSubjectCommitment,
						dl3SignatureCommitment,
						completionsRoot,
						leafSchemaVersion: LEAF_SCHEMA_VERSION_V1,
						signersCommitment,
						timestamp: BigInt(timestamp),
					},
				},
				{ verifyingContract: registry.address },
			),
	);

	const settlementRules = await deps.rpcQuery.settlements.listByFile.call({
		pieceCid,
	});
	const needsPayoutAck = assertSettlementAck({
		settlementRules,
		settlementRecipientAck,
	});

	await deps.rpcQuery.files.piece.sign.call({
		pieceCid,
		body: {
			signature,
			timestamp,
			dl3Signature: toHex(dl3Signature),
			completedFieldIds,
			...(fieldCompletions && Object.keys(fieldCompletions).length > 0
				? {
						fieldCompletions:
							fieldCompletionInputMapFromStored(fieldCompletions),
					}
				: {}),
			...(needsPayoutAck ? { settlementRecipientAck } : {}),
		},
	});
}
