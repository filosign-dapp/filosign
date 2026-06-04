import { randomBytes, toHex } from "@filosign/crypto-utils";
import type { InferClientInputs } from "@orpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Address, Hex } from "viem";
import { useFilosignContext } from "../../context/useFilosignContext";
import {
	buildColdExternalShare,
	buildWarmExternalShare,
	decryptDraftDekFromOrgHead,
} from "../../lib/draft-crypto";
import { draftOrganizationId } from "../../lib/resolve-draft-dek";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";
import { walletAccountAddress } from "../../utils/evm";

type DraftShareExternalInput =
	InferClientInputs<AppRouterClient>["drafts"]["shareExternal"];
type DraftShareExternalPayload = DraftShareExternalInput["shares"][number];

export type ShareDraftExternalResult = {
	shares: {
		shareId: string;
		email: string;
		accessKind: "warm" | "cold";
		inviteToken: string;
		phrase?: string;
	}[];
};

export function useShareDraftExternal() {
	const { wallet } = useFilosignContext();
	const { rpc, rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: {
			draftId: string;
			emails: string[];
		}): Promise<ShareDraftExternalResult> => {
			if (!wallet?.account || !isAuthed) {
				throw new Error("Wallet required");
			}
			const walletAddress = walletAccountAddress(wallet.account);
			const head = await rpc.drafts.get({ draftId: args.draftId });
			const organizationId = draftOrganizationId(head);
			if (!head.headDekWrappedOmk || !head.headOmkKemCiphertext) {
				throw new Error("Save the draft before sharing");
			}
			const myWrap = await rpcQuery.orgs.keys.wrapForMine.call({
				organizationId,
			});
			const dek = await decryptDraftDekFromOrgHead({
				draftId: args.draftId,
				headDekWrappedOmk: head.headDekWrappedOmk,
				headOmkKemCiphertext: head.headOmkKemCiphertext,
				wallet: walletAddress,
				myWrap,
			});

			const shares: ShareDraftExternalResult["shares"] = [];
			const payloadShares: DraftShareExternalPayload[] = [];

			for (const rawEmail of args.emails) {
				const email = rawEmail.trim().toLowerCase();
				if (!email) continue;
				const inviteToken = toHex(randomBytes(32));

				let recipientPk: Hex | undefined;
				let recipientWallet: Address | undefined;
				try {
					const profile = await rpc.users.profile.lookup({ query: email });
					if (profile.encryptionPublicKey && profile.walletAddress) {
						recipientPk = profile.encryptionPublicKey;
						recipientWallet = profile.walletAddress;
					}
				} catch {
					// Off-platform email → cold invite
				}

				if (recipientPk && recipientWallet) {
					const warm = await buildWarmExternalShare({
						dek,
						draftId: args.draftId,
						inviteToken,
						recipientEncryptionPublicKey: recipientPk,
						recipientWallet,
					});
					payloadShares.push({
						accessKind: "warm",
						email,
						inviteToken,
						recipientWallet,
						kemCiphertext: warm.kemCiphertext,
						encryptedDek: warm.encryptedDek,
					});
					shares.push({
						shareId: "",
						email,
						accessKind: "warm",
						inviteToken,
					});
				} else {
					const cold = await buildColdExternalShare({
						dek,
						draftId: args.draftId,
						inviteToken,
					});
					payloadShares.push({
						accessKind: "cold",
						email,
						inviteToken,
						wrappedDek: cold.wrappedDek,
					});
					shares.push({
						shareId: "",
						email,
						accessKind: "cold",
						inviteToken,
						phrase: cold.phrase,
					});
				}
			}

			if (payloadShares.length === 0) {
				throw new Error("No valid emails to share with");
			}

			const result = await rpc.drafts.shareExternal({
				draftId: args.draftId,
				shares: payloadShares,
			});

			return {
				shares: result.shares.map((row, i) => ({
					...row,
					accessKind: row.accessKind as "warm" | "cold",
					phrase: shares[i]?.phrase,
				})),
			};
		},
		onSuccess: async (_data, variables) => {
			await queryClient.invalidateQueries({
				queryKey: rpcQuery.drafts.listExternalShares.key({
					input: { draftId: variables.draftId },
				}),
			});
		},
	});
}
