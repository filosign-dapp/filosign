import { computeCidIdentifier, eip712signature } from "@filosign/contracts";
import {
	FILE_ACK_INTENT_VERSION_V1,
	hashNormalizedSignerEmail,
	normalizePlacementRecipientEmail,
} from "@filosign/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getAddress } from "viem";
import { useFilosignContext } from "../../context/useFilosignContext";
import { latestChainTimestamp } from "../../lib/chain-time";
import { envelopeRegistryAt } from "../../lib/envelope-registry-at";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import { useUserProfile } from "../users/useUserProfile";

export function useAckFile() {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const { contracts, wallet } = useFilosignContext();
	const queryClient = useQueryClient();
	const { data: userProfile } = useUserProfile();

	return useMutation({
		mutationFn: async (args: { pieceCid: string }) => {
			const { pieceCid } = args;

			if (!isAuthed || !contracts || !wallet) {
				throw new Error("not connected");
			}

			const fileResponse = await rpcQuery.files.piece.detail.call({
				pieceCid,
			});

			const { sender, registryAddress, signers, viewers } = fileResponse;
			const registry = envelopeRegistryAt(contracts, registryAddress);

			const cidIdentifier = computeCidIdentifier(pieceCid);
			const timestamp = await latestChainTimestamp(contracts);

			const addr = getAddress(wallet.account.address);
			let rawEmail: string | null = null;
			for (const s of signers) {
				if (getAddress(s.wallet) === addr) {
					const e = s.email?.trim();
					if (e) {
						rawEmail = e;
						break;
					}
				}
			}
			if (!rawEmail) {
				for (const v of viewers) {
					if (getAddress(v.wallet) === addr) {
						const e = v.email?.trim();
						if (e) {
							rawEmail = e;
							break;
						}
					}
				}
			}
			if (!rawEmail) {
				throw new Error(
					"No email on file roster for your wallet; sync your profile or re-open the document.",
				);
			}
			const viewerEmailCommitment = hashNormalizedSignerEmail(
				normalizePlacementRecipientEmail(rawEmail),
			);

			const privySubjectCommitment = userProfile?.privySubjectCommitment;
			if (!privySubjectCommitment) {
				throw new Error(
					"Profile missing Privy subject commitment; try re-login.",
				);
			}

			const signature = await eip712signature(
				contracts,
				"FSEnvelopeRegistry",
				{
					types: {
						AckEnvelope: [
							{ name: "cidIdentifier", type: "bytes32" },
							{ name: "sender", type: "address" },
							{ name: "viewerWallet", type: "address" },
							{ name: "viewerEmailCommitment", type: "bytes32" },
							{ name: "privySubjectCommitment", type: "bytes32" },
							{ name: "timestamp", type: "uint256" },
						],
					},
					primaryType: "AckEnvelope",
					message: {
						cidIdentifier,
						sender,
						viewerWallet: wallet.account.address,
						viewerEmailCommitment,
						privySubjectCommitment,
						timestamp: BigInt(timestamp),
					},
				},
				{ verifyingContract: registry.address },
			);

			await rpcQuery.files.piece.ack.call({
				pieceCid,
				body: {
					signature,
					timestamp,
					intentVersion: FILE_ACK_INTENT_VERSION_V1,
				},
			});

			void queryClient.invalidateQueries({
				queryKey: rpcQuery.files.piece.detail.key({
					input: { pieceCid },
				}),
			});

			return true;
		},
	});
}
