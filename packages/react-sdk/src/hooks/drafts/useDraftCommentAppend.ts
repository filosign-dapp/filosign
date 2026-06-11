import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toHex } from "viem";
import { useFilosignContext } from "../../context/useFilosignContext";
import { encryptDraftComment } from "../../lib/draft-crypto";
import {
	draftOrganizationId,
	resolveDraftDek,
} from "../../lib/resolve-draft-dek";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import { walletAccountAddress } from "../../utils/evm";
import { invalidateDraftCommentQueries } from "./invalidate-draft-comments";

export function useDraftCommentAppend() {
	const { wallet } = useFilosignContext();
	const { rpc, rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: {
			draftId: string;
			body: string;
			organizationId?: string | null;
			inviteToken?: string;
			/** When set (external review), decrypt DEK via warm/cold grant instead of org/user head. */
			reviewDek?: Uint8Array;
		}) => {
			const trimmed = args.body.trim();
			if (!trimmed) throw new Error("Comment cannot be empty");

			const isExternal = Boolean(args.inviteToken?.trim() && args.reviewDek);
			if (!isExternal && (!wallet?.account || !isAuthed)) {
				throw new Error("Wallet required");
			}

			const walletAddress = wallet?.account
				? walletAccountAddress(wallet.account)
				: null;
			let dek = args.reviewDek;

			if (!dek) {
				if (!walletAddress) throw new Error("Wallet required");
				const head = await rpc.drafts.get({ draftId: args.draftId });
				const organizationId = draftOrganizationId(head);
				const myWrap = await rpcQuery.orgs.keys.wrapForMine.call({
					organizationId,
				});
				dek = await resolveDraftDek({
					draftId: args.draftId,
					head,
					wallet: walletAddress,
					myOrgWrap: {
						wrappedOmk: myWrap.wrappedOmk,
						wrapKemCiphertext: myWrap.wrapKemCiphertext,
					},
				});
			}

			const commentId = crypto.randomUUID();
			const ciphertext = await encryptDraftComment({
				dek,
				draftId: args.draftId,
				commentId,
				body: trimmed,
			});

			if (isExternal) {
				const externalToken = args.inviteToken?.trim();
				if (!externalToken) throw new Error("inviteToken required");
				return rpc.drafts.comments.appendByToken({
					draftId: args.draftId,
					commentId,
					ciphertext: toHex(ciphertext),
					inviteToken: externalToken,
				});
			}

			return rpc.drafts.comments.append({
				draftId: args.draftId,
				commentId,
				ciphertext: toHex(ciphertext),
				inviteToken: args.inviteToken,
			});
		},
		onSuccess: async (_data, variables) => {
			await invalidateDraftCommentQueries(
				queryClient,
				rpcQuery,
				variables.draftId,
				variables.inviteToken,
			);
		},
	});
}
