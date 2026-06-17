import type { Address, Hex } from "viem";
import { getAddress } from "viem";
import { waitForRelayReceipt } from "@/lib/platform/evm";
import { withRegistryWalletLock } from "@/lib/platform/evm/registry-wallet-lock";
import { withRelayerPoolFailover } from "@/lib/platform/evm/relay-failover";
import {
	createRelayReceiptWaiter,
	relayWrite,
} from "@/lib/platform/evm/relay-write";
import { withRelayerLock } from "@/lib/platform/evm/relayer-lock";
import {
	fsContractsForRelayer,
	getRelayerWalletClient,
	type RelayerPoolMember,
} from "@/lib/platform/evm/relayer-pool";
import { recoverRegisterEnvelopeTxHash } from "./register-helpers";

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
	primaryRelayer: RelayerPoolMember;
	pendingTxHash?: Hex | null;
};

export type RegisterEnvelopeRelayResult = {
	txHash: Hex;
	relayer: RelayerPoolMember;
};

async function resolvePendingRegisterTx(args: {
	pieceCid: string;
	sender: Address;
	pendingTxHash: Hex;
}): Promise<Hex | null> {
	const recovered = await recoverRegisterEnvelopeTxHash({
		pieceCid: args.pieceCid,
		sender: args.sender,
	});
	if (recovered) {
		return recovered;
	}

	const receipt = await waitForRelayReceipt(args.pendingTxHash).catch(
		() => null,
	);
	if (!receipt) {
		return null;
	}
	if (receipt.status === "success") {
		return (
			(await recoverRegisterEnvelopeTxHash({
				pieceCid: args.pieceCid,
				sender: args.sender,
			})) ?? args.pendingTxHash
		);
	}
	return null;
}

export async function relayRegisterEnvelope(
	args: RegisterEnvelopeRelayArgs & {
		onBroadcast?: (hash: Hex) => Promise<void>;
	},
): Promise<RegisterEnvelopeRelayResult> {
	const recoveredTxHash = await recoverRegisterEnvelopeTxHash({
		pieceCid: args.pieceCid,
		sender: args.sender,
	});
	if (recoveredTxHash) {
		return { txHash: recoveredTxHash, relayer: args.primaryRelayer };
	}

	if (args.pendingTxHash) {
		const pendingResolved = await resolvePendingRegisterTx({
			pieceCid: args.pieceCid,
			sender: args.sender,
			pendingTxHash: args.pendingTxHash,
		});
		if (pendingResolved) {
			return { txHash: pendingResolved, relayer: args.primaryRelayer };
		}
	}

	const {
		onBroadcast,
		primaryRelayer,
		pendingTxHash: _pending,
		...relayArgs
	} = args;

	const failover = await withRelayerPoolFailover({
		primary: primaryRelayer,
		step: "registerEnvelope",
		context: { pieceCid: args.pieceCid },
		run: async (member) => {
			const relayer = getAddress(member.address);
			const { FSEnvelopeRegistry } = fsContractsForRelayer(relayer);
			const waitForReceipt = createRelayReceiptWaiter(
				getRelayerWalletClient(relayer),
			);

			const txHash = await withRelayerLock(relayer, () =>
				withRegistryWalletLock(relayArgs.sender as `0x${string}`, () =>
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
						waitForReceipt,
					}),
				),
			);

			const registered = await recoverRegisterEnvelopeTxHash({
				pieceCid: relayArgs.pieceCid,
				sender: relayArgs.sender,
			});
			if (registered) {
				return registered;
			}
			return txHash;
		},
	});

	return { txHash: failover.result, relayer: failover.relayer };
}
