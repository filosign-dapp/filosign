import { useQuery } from "@tanstack/react-query";
import type { Address, Hex } from "viem";
import { useFilosignContext } from "../../context/useFilosignContext";
import {
	draftOrganizationId,
	resolveDraftDek,
} from "../../lib/resolve-draft-dek";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import { decryptDraftCommentsList } from "./useDraftComments";

export function useDraftCommentsDecrypted(args: {
	draftId: string | undefined;
	/** Cache partition only (active workspace). DEK uses `drafts.get` metadata. */
	workspaceOrgId?: string | null;
	/** External reviewers pass DEK after unlocking the draft. */
	reviewDek?: Uint8Array;
}) {
	const { wallet } = useFilosignContext();
	const { rpc, rpcQuery, isAuthed } = useFilosignRpc();
	const draftId = args.draftId?.trim();

	return useQuery({
		queryKey: [
			"filosign",
			"drafts",
			"comments-decrypted",
			draftId ?? "",
			args.workspaceOrgId ?? "",
			Boolean(args.reviewDek),
		],
		enabled: Boolean(draftId) && (Boolean(args.reviewDek) || isAuthed),
		queryFn: async () => {
			if (!draftId) throw new Error("draftId required");

			const list = await rpcQuery.drafts.comments.list.call({ draftId });
			if (list.comments.length === 0) return [];

			let dek = args.reviewDek;
			if (!dek) {
				if (!wallet?.account) throw new Error("Wallet required");
				const walletAddress = wallet.account.address as Address;
				const head = await rpc.drafts.get({ draftId });
				const organizationId = draftOrganizationId(head);
				const myWrap = await rpcQuery.orgs.keys.wrapForMine.call({
					organizationId,
				});
				dek = await resolveDraftDek({
					draftId,
					head,
					wallet: walletAddress,
					myOrgWrap: {
						wrappedOmk: myWrap.wrappedOmk as Hex,
						wrapKemCiphertext: myWrap.wrapKemCiphertext as Hex,
					},
				});
			}

			return decryptDraftCommentsList({
				draftId,
				dek,
				comments: list.comments,
			});
		},
	});
}
