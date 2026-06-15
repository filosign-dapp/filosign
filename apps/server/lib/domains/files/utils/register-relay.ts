import type { Address, Hex } from "viem";
import {
	fsContracts,
	getActiveRelayerAddress,
	waitForRelayReceipt,
} from "@/lib/platform/evm";
import { withRegistryWalletLock } from "@/lib/platform/evm/registry-wallet-lock";
import { relayWrite } from "@/lib/platform/evm/relay-write";
import { withRelayerLock } from "@/lib/platform/evm/relayer-lock";
import { recoverRegisterEnvelopeTxHash } from "./register-helpers";

const { FSEnvelopeRegistry } = fsContracts;

export type RegisterEnvelopeRelayArgs = {
	pieceCid: string;
	sender: Address;
	requiredCommitments: readonly Hex[];
	optionalCommitments: readonly Hex[];
	viewerEmailCommitments: readonly Hex[];
	senderEmailCommitment: Hex;
	senderAuthSubjectCommitment: Hex;
	orgIdCommitment: Hex;
	routingMode: 0 | 1;
	routingOrder: readonly Hex[];
	quorumN: number;
	quorumSet: readonly Hex[];
	timestamp: number;
	signature: Hex;
	placementCommitment: Hex;
	documentSha256: Hex;
};

export async function relayRegisterEnvelope(
	args: RegisterEnvelopeRelayArgs,
): Promise<Hex> {
	const recoveredTxHash = await recoverRegisterEnvelopeTxHash({
		pieceCid: args.pieceCid,
		sender: args.sender,
	});
	if (recoveredTxHash) {
		return recoveredTxHash;
	}

	return withRelayerLock(getActiveRelayerAddress(), () =>
		withRegistryWalletLock(args.sender, () =>
			relayWrite({
				step: "registerEnvelope",
				write: () =>
					FSEnvelopeRegistry.write.registerEnvelope([
						{
							pieceCid: args.pieceCid,
							sender: args.sender,
							requiredCommitments: args.requiredCommitments,
							optionalCommitments: args.optionalCommitments,
							viewerEmailCommitments: args.viewerEmailCommitments,
							senderEmailCommitment: args.senderEmailCommitment,
							senderAuthSubjectCommitment: args.senderAuthSubjectCommitment,
							orgIdCommitment: args.orgIdCommitment,
							routingMode: args.routingMode,
							routingOrder: args.routingOrder,
							quorumN: args.quorumN,
							quorumSet: args.quorumSet,
							timestamp: BigInt(args.timestamp),
							signature: args.signature,
							placementCommitment: args.placementCommitment,
							documentSha256: args.documentSha256,
						},
					]),
				waitForReceipt: waitForRelayReceipt,
			}),
		),
	);
}
