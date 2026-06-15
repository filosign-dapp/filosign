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
	args: RegisterEnvelopeRelayArgs & {
		onBroadcast?: (hash: Hex) => Promise<void>;
	},
): Promise<Hex> {
	const recoveredTxHash = await recoverRegisterEnvelopeTxHash({
		pieceCid: args.pieceCid,
		sender: args.sender,
	});
	if (recoveredTxHash) {
		return recoveredTxHash;
	}

	const { onBroadcast, ...relayArgs } = args;

	return withRelayerLock(getActiveRelayerAddress(), () =>
		withRegistryWalletLock(relayArgs.sender, () =>
			relayWrite({
				step: "registerEnvelope",
				onBroadcast,
				write: () =>
					FSEnvelopeRegistry.write.registerEnvelope([
						{
							pieceCid: relayArgs.pieceCid,
							sender: relayArgs.sender,
							requiredCommitments: relayArgs.requiredCommitments,
							optionalCommitments: relayArgs.optionalCommitments,
							viewerEmailCommitments: relayArgs.viewerEmailCommitments,
							senderEmailCommitment: relayArgs.senderEmailCommitment,
							senderAuthSubjectCommitment:
								relayArgs.senderAuthSubjectCommitment,
							orgIdCommitment: relayArgs.orgIdCommitment,
							routingMode: relayArgs.routingMode,
							routingOrder: relayArgs.routingOrder,
							quorumN: relayArgs.quorumN,
							quorumSet: relayArgs.quorumSet,
							timestamp: BigInt(relayArgs.timestamp),
							signature: relayArgs.signature,
							placementCommitment: relayArgs.placementCommitment,
							documentSha256: relayArgs.documentSha256,
						},
					]),
				waitForReceipt: waitForRelayReceipt,
			}),
		),
	);
}
