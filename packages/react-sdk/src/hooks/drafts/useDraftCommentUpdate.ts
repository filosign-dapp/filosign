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

export function useDraftCommentUpdate() {
	const { wallet } = useFilosignContext();
	const { rpc, rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: {
			draftId: string;
			commentId: string;
			body: string;
			reviewDek?: Uint8Array;
		}) => {
			if (!wallet?.account || !isAuthed) {
				throw new Error("Wallet required");
			}
			const trimmed = args.body.trim();
			if (!trimmed) throw new Error("Comment cannot be empty");

			const walletAddress = walletAccountAddress(wallet.account);
			let dek = args.reviewDek;

			if (!dek) {
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

			const ciphertext = await encryptDraftComment({
				dek,
				draftId: args.draftId,
				commentId: args.commentId,
				body: trimmed,
			});

			return rpc.drafts.comments.update({
				draftId: args.draftId,
				commentId: args.commentId,
				ciphertext: toHex(ciphertext),
			});
		},
		onSuccess: async (_data, variables) => {
			await invalidateDraftCommentQueries(
				queryClient,
				rpcQuery,
				variables.draftId,
			);
		},
	});
}
