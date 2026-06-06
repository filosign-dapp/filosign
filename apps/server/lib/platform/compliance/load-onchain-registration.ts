import type { Address, Hex } from "viem";
import { getAddress } from "viem";
import { fsEnvelopeRegistryAt } from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import type { ComplianceLoadContext } from "./load-context";

export async function loadOnchainRegistration(args: {
	pieceCid: string;
	registryAddress: Address;
}): Promise<ComplianceLoadContext["onchainRegistration"]> {
	const registry = fsEnvelopeRegistryAt(args.registryAddress);
	const cidRes = await tryCatch(registry.read.cidIdentifier([args.pieceCid]));
	if (!cidRes.data) return null;

	const cidId = cidRes.data as Hex;
	const regRes = await tryCatch(registry.read.envelopeRegistrations([cidId]));
	const reg = regRes.data as
		| {
				sender: Address;
				signersCommitment: Hex;
				viewersCommitment: Hex;
				placementCommitment: Hex;
				documentSha256: Hex;
				senderEmailCommitment: Hex;
				senderAuthSubjectCommitment: Hex;
				orgIdCommitment: Hex;
				requiredSignersCount: number | bigint;
				requiredSignaturesCount: number | bigint;
				signaturesCount: number | bigint;
				quorumN: number | bigint;
				routingMode: number | bigint;
				completedAt: number | bigint;
				revokedBeforeCompletedAt: number | bigint;
				revokedBy: Address;
				timestamp: bigint;
		  }
		| undefined;
	if (!reg || reg.timestamp <= 0n) return null;

	let rosterSignedCount = Number(reg.signaturesCount);
	const rosterRes = await tryCatch(
		(
			registry.read as typeof registry.read & {
				rosterSignedCount: (args: readonly [Hex]) => Promise<number | bigint>;
			}
		).rosterSignedCount([cidId]),
	);
	if (!rosterRes.error && rosterRes.data != null) {
		rosterSignedCount = Number(rosterRes.data);
	}

	const completedAtChain =
		reg.completedAt != null && Number(reg.completedAt) > 0
			? String(reg.completedAt)
			: null;
	const revokedBeforeCompletedAtChain =
		reg.revokedBeforeCompletedAt != null &&
		Number(reg.revokedBeforeCompletedAt) > 0
			? String(reg.revokedBeforeCompletedAt)
			: null;

	return {
		cidIdentifier: cidId,
		sender: getAddress(reg.sender),
		signersCommitment: reg.signersCommitment as Hex,
		viewersCommitment: reg.viewersCommitment as Hex,
		placementCommitment: reg.placementCommitment as Hex,
		documentSha256: reg.documentSha256 as Hex,
		senderEmailCommitment: reg.senderEmailCommitment as Hex,
		senderAuthSubjectCommitment: reg.senderAuthSubjectCommitment as Hex,
		requiredSignersCount: Number(reg.requiredSignersCount),
		requiredSignaturesCount: Number(reg.requiredSignaturesCount),
		signaturesCount: Number(reg.signaturesCount),
		quorumN: Number(reg.quorumN),
		routingMode: Number(reg.routingMode),
		completedAt: completedAtChain,
		revokedBeforeCompletedAt: revokedBeforeCompletedAtChain,
		revokedBy:
			reg.revokedBy &&
			getAddress(reg.revokedBy) !== "0x0000000000000000000000000000000000000000"
				? getAddress(reg.revokedBy)
				: null,
		rosterSignedCount,
		timestamp: reg.timestamp.toString(),
		orgIdCommitment: reg.orgIdCommitment as Hex,
	};
}
