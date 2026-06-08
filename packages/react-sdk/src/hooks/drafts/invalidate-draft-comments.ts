import type { QueryClient } from "@tanstack/react-query";
import type { useFilosignRpc } from "../../lib/use-filosign-rpc";

export async function invalidateDraftCommentQueries(
	queryClient: QueryClient,
	rpcQuery: ReturnType<typeof useFilosignRpc>["rpcQuery"],
	draftId: string,
) {
	await queryClient.invalidateQueries({
		queryKey: rpcQuery.drafts.comments.list.key({
			input: { draftId },
		}),
	});
	await queryClient.invalidateQueries({
		queryKey: ["filosign", "drafts", "comments-decrypted", draftId],
	});
}
