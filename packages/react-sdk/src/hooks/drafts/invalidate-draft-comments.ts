import type { QueryClient } from "@tanstack/react-query";
import type { useFilosignRpc } from "../../lib/use-filosign-rpc";

export async function invalidateDraftCommentQueries(
	queryClient: QueryClient,
	rpcQuery: ReturnType<typeof useFilosignRpc>["rpcQuery"],
	draftId: string,
	inviteToken?: string,
) {
	await queryClient.invalidateQueries({
		queryKey: rpcQuery.drafts.comments.list.key({
			input: { draftId },
		}),
	});

	const trimmedInviteToken = inviteToken?.trim();
	if (trimmedInviteToken) {
		await queryClient.invalidateQueries({
			queryKey: rpcQuery.drafts.comments.listByToken.key({
				input: { draftId, inviteToken: trimmedInviteToken },
			}),
		});
	}

	await queryClient.invalidateQueries({
		queryKey: ["filosign", "drafts", "comments-decrypted", draftId],
	});
}
