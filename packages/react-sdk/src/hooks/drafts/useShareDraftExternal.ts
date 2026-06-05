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
import { getCachedDraftDek } from "../../lib/draft-dek-cache";
import { draftOrganizationId } from "../../lib/resolve-draft-dek";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";
import { walletAccountAddress } from "../../utils/evm";

type DraftShareExternalInput =
	InferClientInputs<AppRouterClient>["drafts"]["shareExternal"];
type DraftShareExternalPayload = DraftShareExternalInput["shares"][number];

function isUserNotFoundLookupError(error: unknown): boolean {
	if (!error || typeof error !== "object") return false;
	const data = (error as { data?: unknown }).data;
	if (!data || typeof data !== "object") return false;
	return (data as { appCode?: unknown }).appCode === "USERS.USER_NOT_FOUND";
}

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
			const cachedDek = getCachedDraftDek(args.draftId, walletAddress);
			const dek =
				cachedDek ??
				(await decryptDraftDekFromOrgHead({
					draftId: args.draftId,
					headDekWrappedOmk: head.headDekWrappedOmk,
					headOmkKemCiphertext: head.headOmkKemCiphertext,
					wallet: walletAddress,
					myWrap,
				}));

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
				} catch (lookupError) {
					if (!isUserNotFoundLookupError(lookupError)) {
						throw lookupError;
					}
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

			const phraseByInviteToken = new Map(
				shares
					.filter((row) => row.phrase)
					.map((row) => [row.inviteToken, row.phrase] as const),
			);

			return {
				shares: result.shares.map((row) => ({
					...row,
					accessKind: row.accessKind as "warm" | "cold",
					phrase: phraseByInviteToken.get(row.inviteToken),
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
