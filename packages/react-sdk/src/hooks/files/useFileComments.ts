import { useQuery } from "@tanstack/react-query";
import { toBytes } from "viem";
import { decryptFileComment } from "../../lib/file-crypto";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useFileCommentsList(
	pieceCid: string | undefined,
	options?: { enabled?: boolean },
) {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const id = pieceCid?.trim();

	return useQuery({
		queryKey: rpcQuery.files.comments.list.key({
			input: { pieceCid: id ?? "" },
		}),
		queryFn: () => {
			if (!id) throw new Error("pieceCid required");
			return rpcQuery.files.comments.list.call({ pieceCid: id });
		},
		enabled: isAuthed && Boolean(id) && options?.enabled !== false,
	});
}

export async function decryptFileCommentsList(args: {
	pieceCid: string;
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
			const body = await decryptFileComment({
				dek: args.dek,
				pieceCid: args.pieceCid,
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
			// Skip comments encrypted with a prior file DEK rotation (unlikely).
		}
	}

	if (args.comments.length > 0 && out.length === 0) {
		throw new Error(
			"Could not decrypt envelope comments. Open the document to refresh keys, then try again.",
		);
	}

	return out;
}

export { useFileCommentAppend } from "./useFileCommentAppend";
