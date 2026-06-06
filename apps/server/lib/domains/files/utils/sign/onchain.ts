import {
	computeCommitment,
	jsonStringify,
	signatures,
	toBytes,
} from "@filosign/crypto-utils/node";
import { throwAppError } from "@filosign/errors/server";
import type { PlacementManifest } from "@filosign/shared";
import {
	hashAuthSubjectCommitment,
	hashNormalizedSignerEmail,
	LEAF_SCHEMA_VERSION_V1,
	zRegisterRoutingInput,
} from "@filosign/shared";
import type { Address } from "viem";
import {
	evmClient,
	fsEnvelopeRegistryAt,
	relayRegisterEnvelopeSignature,
} from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { resolveSignRoutingCalldata } from "../routing-calldata";

export async function verifyAndRelayPieceSignature(args: {
	pieceCid: string;
	sender: Address;
	signerWallet: Address;
	signerEmail: string;
	authProviderId: string;
	timestamp: number;
	signature: `0x${string}`;
	dl3Signature: `0x${string}`;
	completionsRoot: `0x${string}`;
	signerDl3PubKey: string;
	registryAddress: `0x${string}`;
	placementManifest: PlacementManifest;
	registerRoutingJson: unknown;
}): Promise<`0x${string}`> {
	const dilithium = await signatures.dilithiumInstance();
	const encoder = new TextEncoder();

	const dl3SignatureMessage = jsonStringify({
		pieceCid: args.pieceCid,
		sender: args.sender,
		signer: args.signerWallet,
		timestamp: args.timestamp,
		completionsRoot: args.completionsRoot,
		leafSchemaVersion: LEAF_SCHEMA_VERSION_V1,
	});
	const dl3SignatureCommitment = computeCommitment([args.dl3Signature]);

	const isDl3SignatureValid = await signatures.verify({
		dl: dilithium,
		message: encoder.encode(dl3SignatureMessage),
		signature: toBytes(args.dl3Signature),
		publicKey: toBytes(args.signerDl3PubKey),
	});

	if (!isDl3SignatureValid) {
		throwAppError("SIGNING.SIGNATURE_INVALID");
	}

	const signerEmailCommitment = hashNormalizedSignerEmail(args.signerEmail);
	const authSubjectCommitment = hashAuthSubjectCommitment(args.authProviderId);

	const registerRoutingParsed = zRegisterRoutingInput.safeParse(
		args.registerRoutingJson ?? {},
	);
	const routingCalldata = resolveSignRoutingCalldata({
		placementManifest: args.placementManifest,
		registerRouting: registerRoutingParsed.success
			? registerRoutingParsed.data
			: undefined,
	});

	const registerSignatureArgs = [
		args.pieceCid,
		args.sender,
		args.signerWallet,
		signerEmailCommitment,
		authSubjectCommitment,
		dl3SignatureCommitment,
		BigInt(args.timestamp),
		args.signature,
		args.completionsRoot,
		LEAF_SCHEMA_VERSION_V1,
		routingCalldata.routingOrder,
		routingCalldata.quorumSet,
	] as const;
	const registry = fsEnvelopeRegistryAt(args.registryAddress);

	const simulateRes = await tryCatch(
		registry.simulate.registerEnvelopeSignature(registerSignatureArgs, {
			account: evmClient.account,
		}) as Promise<unknown>,
	);
	if (simulateRes.error) {
		throwAppError("SIGNING.SIGNATURE_INVALID");
	}

	return relayRegisterEnvelopeSignature(registry, registerSignatureArgs);
}
