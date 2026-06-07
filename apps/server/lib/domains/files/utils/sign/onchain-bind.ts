import { computeCidIdentifier } from "@filosign/contracts";
import { throwAppError } from "@filosign/errors/server";
import type { Address } from "viem";
import { getAddress, zeroAddress } from "viem";
import {
	evmClient,
	fsEnvelopeRegistryAt,
	relayRegisterEnvelopeAck,
} from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

type EnvelopeRegistrySignerBindRead = {
	boundSignerWallet: (
		args: readonly [`0x${string}`, `0x${string}`],
	) => Promise<Address>;
};

type EnvelopeRegistryAckSimulate = {
	registerEnvelopeAck: (
		args: readonly unknown[],
		options: { account: typeof evmClient.account },
	) => Promise<unknown>;
};

export async function relayBoundSignerAckIfNeeded(args: {
	pieceCid: string;
	sender: Address;
	signerWallet: Address;
	signerEmailCommitment: `0x${string}`;
	authSubjectCommitment: `0x${string}`;
	ackTimestamp: number;
	ackSignature: `0x${string}`;
	registryAddress: `0x${string}`;
}): Promise<void> {
	const registry = fsEnvelopeRegistryAt(args.registryAddress);
	const cidId = computeCidIdentifier(args.pieceCid);
	const bound = await (
		registry.read as unknown as EnvelopeRegistrySignerBindRead
	).boundSignerWallet([cidId, args.signerEmailCommitment]);
	if (getAddress(bound) !== zeroAddress) {
		if (getAddress(bound) !== getAddress(args.signerWallet)) {
			throwAppError("SIGNING.SIGNATURE_INVALID");
		}
		return;
	}

	const isSigner = await registry.read.isSigner([
		cidId,
		args.signerEmailCommitment,
	]);
	if (!isSigner) return;

	const simulateRes = await tryCatch(
		(
			registry.simulate as unknown as EnvelopeRegistryAckSimulate
		).registerEnvelopeAck(
			[
				args.pieceCid,
				args.sender,
				args.signerWallet,
				args.signerEmailCommitment,
				args.authSubjectCommitment,
				BigInt(args.ackTimestamp),
				args.ackSignature,
			],
			{ account: evmClient.account },
		),
	);
	if (simulateRes.error) {
		throwAppError("SIGNING.SIGNATURE_INVALID");
	}

	await relayRegisterEnvelopeAck(registry, [
		args.pieceCid,
		args.sender,
		args.signerWallet,
		args.signerEmailCommitment,
		args.authSubjectCommitment,
		BigInt(args.ackTimestamp),
		args.ackSignature,
	]);
}
