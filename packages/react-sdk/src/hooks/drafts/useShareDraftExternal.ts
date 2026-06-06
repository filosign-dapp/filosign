import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import {
	type ShareDraftExternalResult,
	shareDraftExternal,
} from "../../lib/share-draft-external/share-draft-external";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export type { ShareDraftExternalResult } from "../../lib/share-draft-external/share-draft-external";

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

			return shareDraftExternal(
				{
					wallet,
					fetchDraftHead: (draftId) => rpc.drafts.get({ draftId }),
					wrapForMine: (organizationId) =>
						rpcQuery.orgs.keys.wrapForMine.call({ organizationId }),
					lookupProfile: (email) => rpc.users.profile.lookup({ query: email }),
					shareExternal: (payload) => rpc.drafts.shareExternal(payload),
				},
				args,
			);
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
