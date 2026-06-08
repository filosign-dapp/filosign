import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useFilosignContext } from "../../context/useFilosignContext";
import { clearAllDraftDekCache } from "../../lib/draft-dek-cache";
import {
	type SaveDraftInput,
	saveDraft,
} from "../../lib/save-draft/save-draft";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export type {
	SaveDraftDocumentInput,
	SaveDraftInput,
} from "../../lib/save-draft/save-draft";

export function useSaveDraft() {
	const { wallet } = useFilosignContext();
	const { rpc, rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();
	const prevWalletRef = useRef<string | undefined>(undefined);

	useEffect(() => {
		const addr = wallet?.account?.address;
		if (
			prevWalletRef.current &&
			addr &&
			prevWalletRef.current.toLowerCase() !== addr.toLowerCase()
		) {
			clearAllDraftDekCache();
		}
		prevWalletRef.current = addr;
	}, [wallet?.account?.address]);

	return useMutation({
		mutationFn: async (input: SaveDraftInput) => {
			if (!wallet?.account || !isAuthed) {
				throw new Error("Wallet required");
			}

			return saveDraft(
				{
					wallet,
					rpc,
					wrapForMine: (organizationId) =>
						rpcQuery.orgs.keys.wrapForMine.call({ organizationId }),
					fetchDraftHead: (draftId) => rpc.drafts.get({ draftId }),
					prepareSave: (payload) => rpc.drafts.prepareSave(payload),
					saveDraft: (payload) => rpc.drafts.save(payload),
				},
				input,
			);
		},
		onSuccess: async (data, variables) => {
			const getKey = rpcQuery.drafts.get.key({
				input: { draftId: variables.draftId },
			});
			queryClient.setQueryData(getKey, (prev) => {
				if (!prev || typeof prev !== "object" || !("draft" in prev)) {
					return prev;
				}
				const head = prev as {
					draft: { revision: number; title?: string; updatedAt?: Date };
				};
				return {
					...head,
					draft: {
						...head.draft,
						revision: data.revision,
						title: variables.title?.trim() ?? head.draft.title,
						updatedAt: new Date(),
					},
				};
			});

			const trimmedTitle = variables.title?.trim();
			queryClient.setQueryData(
				rpcQuery.documents.list.key(),
				(
					prev:
						| {
								items: Array<{
									kind: string;
									id: string;
									title?: string;
									updatedAt?: Date | string;
								}>;
								nextCursor: string | null;
						  }
						| undefined,
				) => {
					if (!prev?.items) return prev;
					return {
						...prev,
						items: prev.items.map((row) => {
							if (row.kind !== "draft" || row.id !== variables.draftId) {
								return row;
							}
							return {
								...row,
								...(trimmedTitle ? { title: trimmedTitle } : {}),
								updatedAt: new Date(),
							};
						}),
					};
				},
			);
		},
	});
}
