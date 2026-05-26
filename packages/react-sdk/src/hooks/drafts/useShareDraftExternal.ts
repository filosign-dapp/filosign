import { randomBytes, toHex } from "@filosign/crypto-utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Address, Hex } from "viem";
import { getAddress } from "viem";
import { useFilosignContext } from "../../context/useFilosignContext";
import {
	buildColdExternalShare,
	buildWarmExternalShare,
	decryptDraftDekFromOrgHead,
} from "../../lib/draft-crypto";
import { draftOrganizationId } from "../../lib/resolve-draft-dek";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

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
			const walletAddress = wallet.account.address as Address;
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
				headDekWrappedOmk: head.headDekWrappedOmk as Hex,
				headOmkKemCiphertext: head.headOmkKemCiphertext as Hex,
				wallet: walletAddress,
				myWrap: {
					wrappedOmk: myWrap.wrappedOmk as Hex,
					wrapKemCiphertext: myWrap.wrapKemCiphertext as Hex,
				},
			});

			const shares: ShareDraftExternalResult["shares"] = [];
			const payloadShares: {
				accessKind: "warm" | "cold";
				email: string;
				inviteToken: string;
				recipientWallet?: string;
				kemCiphertext?: Hex;
				encryptedDek?: Hex;
				wrappedDek?: Hex;
			}[] = [];

			for (const rawEmail of args.emails) {
				const email = rawEmail.trim().toLowerCase();
				if (!email) continue;
				const inviteToken = toHex(randomBytes(32));

				let pk: string | undefined;
				let recipientWallet: Address | undefined;
				try {
					const profile = await rpc.users.profile.lookup({ query: email });
					pk = profile.encryptionPublicKey?.trim() || undefined;
					if (pk && profile.walletAddress) {
						recipientWallet = getAddress(profile.walletAddress as Address);
					}
				} catch {
					// Off-platform email → cold invite
				}

				if (pk && recipientWallet) {
					const warm = await buildWarmExternalShare({
						dek,
						draftId: args.draftId,
						inviteToken,
						recipientEncryptionPublicKey: pk as Hex,
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
