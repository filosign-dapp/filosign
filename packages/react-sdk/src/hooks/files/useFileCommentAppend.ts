import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toHex } from "viem";
import { useFilosignContext } from "../../context/useFilosignContext";
import { encryptFileComment } from "../../lib/file-crypto";
import {
	type PieceFileDekSource,
	resolvePieceFileDek,
} from "../../lib/resolve-piece-file-dek";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import { walletAccountAddress } from "../../utils/evm";

export function useFileCommentAppend() {
	const { wallet } = useFilosignContext();
	const { rpc, rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: {
			pieceCid: string;
			body: string;
			/** Piece detail row from `files.piece.detail` (or equivalent). */
			dekSource: PieceFileDekSource;
			organizationId?: string | null;
			/** Pre-resolved DEK when caller already decrypted the file. */
			fileDek?: Uint8Array;
		}) => {
			if (!wallet?.account || !isAuthed) {
				throw new Error("Wallet required");
			}
			const trimmed = args.body.trim();
			if (!trimmed) throw new Error("Comment cannot be empty");

			const walletAddress = walletAccountAddress(wallet.account);
			let dek = args.fileDek;

			if (!dek) {
				const orgId = args.organizationId ?? args.dekSource.organizationId;
				const myWrap =
					orgId && args.dekSource.orgKemCiphertext
						? await rpcQuery.orgs.keys.wrapForMine.call({
								organizationId: orgId,
							})
						: undefined;

				dek = await resolvePieceFileDek({
					wallet: walletAddress,
					detail: args.dekSource,
					myOrgWrap: myWrap
						? {
								wrappedOmk: myWrap.wrappedOmk,
								wrapKemCiphertext: myWrap.wrapKemCiphertext,
							}
						: undefined,
				});
			}

			const commentId = crypto.randomUUID();
			const ciphertext = await encryptFileComment({
				dek,
				pieceCid: args.pieceCid,
				commentId,
				body: trimmed,
			});

			return rpc.files.comments.append({
				pieceCid: args.pieceCid,
				commentId,
				ciphertext: toHex(ciphertext),
			});
		},
		onSuccess: async (_data, variables) => {
			await queryClient.invalidateQueries({
				queryKey: rpcQuery.files.comments.list.key({
					input: { pieceCid: variables.pieceCid },
				}),
			});
			await queryClient.invalidateQueries({
				queryKey: [
					"filosign",
					"files",
					"comments-decrypted",
					variables.pieceCid,
				],
			});
		},
	});
}
