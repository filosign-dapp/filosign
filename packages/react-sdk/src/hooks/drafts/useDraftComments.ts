import { useQuery } from "@tanstack/react-query";
import { toBytes } from "viem";
import { decryptDraftComment } from "../../lib/draft-crypto";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useDraftCommentsList(
	draftId: string | undefined,
	options?: { enabled?: boolean },
) {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const id = draftId?.trim();

	return useQuery({
		queryKey: rpcQuery.drafts.comments.list.key({
			input: { draftId: id ?? "" },
		}),
		queryFn: () => {
			if (!id) throw new Error("draftId required");
			return rpcQuery.drafts.comments.list.call({ draftId: id });
		},
		enabled: isAuthed && Boolean(id) && options?.enabled !== false,
	});
}

export async function decryptDraftCommentsList(args: {
	draftId: string;
	dek: Uint8Array;
	comments: {
		id: string;
		ciphertext: string;
		authorWallet?: string | null;
		createdAt: string | Date;
	}[];
}): Promise<
	{
		id: string;
		body: string;
		authorWallet: string | null | undefined;
		createdAt: string;
	}[]
> {
	const out: {
		id: string;
		body: string;
		authorWallet: string | null | undefined;
		createdAt: string;
	}[] = [];

	for (const row of args.comments) {
		try {
			const body = await decryptDraftComment({
				dek: args.dek,
				draftId: args.draftId,
				commentId: row.id,
				ciphertext: toBytes(row.ciphertext),
			});
			out.push({
				id: row.id,
				body,
				authorWallet: row.authorWallet,
				createdAt:
					typeof row.createdAt === "string"
						? row.createdAt
						: row.createdAt.toISOString(),
			});
		} catch {
			// Skip comments encrypted with a prior draft DEK (e.g. after re-save).
		}
	}

	if (args.comments.length > 0 && out.length === 0) {
		throw new Error(
			"Could not decrypt draft comments. Try saving the draft again, then re-post.",
		);
	}

	return out;
}

export { useDraftCommentAppend } from "./useDraftCommentAppend";
