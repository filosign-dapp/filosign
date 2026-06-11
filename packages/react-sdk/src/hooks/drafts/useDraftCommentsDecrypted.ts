import { useQuery } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import {
	draftOrganizationId,
	resolveDraftDek,
} from "../../lib/resolve-draft-dek";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import { walletAccountAddress } from "../../utils/evm";
import { decryptDraftCommentsList } from "./useDraftComments";

export function useDraftCommentsDecrypted(args: {
	draftId: string | undefined;
	/** Cache partition only (active workspace). DEK uses `drafts.get` metadata. */
	workspaceOrgId?: string | null;
	/** External reviewers pass DEK after unlocking the draft. */
	reviewDek?: Uint8Array;
	/** When set, loads comments via public `listByToken` (draft review link). */
	inviteToken?: string;
}) {
	const { wallet } = useFilosignContext();
	const { rpc, rpcQuery, isAuthed } = useFilosignRpc();
	const draftId = args.draftId?.trim();
	const inviteToken = args.inviteToken?.trim();
	const isExternalReview = Boolean(inviteToken && args.reviewDek);

	return useQuery({
		queryKey: [
			"filosign",
			"drafts",
			"comments-decrypted",
			draftId ?? "",
			args.workspaceOrgId ?? "",
			inviteToken ?? "",
			Boolean(args.reviewDek),
		],
		enabled: Boolean(draftId) && (isExternalReview || isAuthed),
		queryFn: async () => {
			if (!draftId) throw new Error("draftId required");

			let list: Awaited<ReturnType<typeof rpcQuery.drafts.comments.list.call>>;
			if (isExternalReview) {
				if (!inviteToken) throw new Error("inviteToken required");
				list = await rpc.drafts.comments.listByToken({
					draftId,
					inviteToken,
				});
			} else {
				list = await rpcQuery.drafts.comments.list.call({ draftId });
			}
			if (list.comments.length === 0) return [];

			let dek = args.reviewDek;
			if (!dek) {
				if (!wallet?.account) throw new Error("Wallet required");
				const walletAddress = walletAccountAddress(wallet.account);
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
						wrappedOmk: myWrap.wrappedOmk,
						wrapKemCiphertext: myWrap.wrapKemCiphertext,
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
