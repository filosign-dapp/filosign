import { useQuery } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import {
	type PieceFileDekSource,
	resolvePieceFileDek,
} from "../../lib/resolve-piece-file-dek";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import { walletAccountAddress } from "../../utils/evm";
import { decryptFileCommentsList } from "./useFileComments";

export function useFileCommentsDecrypted(args: {
	pieceCid: string | undefined;
	dekSource: PieceFileDekSource | null | undefined;
	/** Pre-resolved DEK when the parent already decrypted the envelope file. */
	fileDek?: Uint8Array;
	enabled?: boolean;
}) {
	const { wallet } = useFilosignContext();
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const pieceCid = args.pieceCid?.trim();
	const canDecrypt = Boolean(
		args.fileDek ||
			(args.dekSource?.orgKemCiphertext && args.dekSource.organizationId) ||
			(args.dekSource?.kemCiphertext && args.dekSource.encryptedEncryptionKey),
	);

	return useQuery({
		queryKey: [
			"filosign",
			"files",
			"comments-decrypted",
			pieceCid ?? "",
			Boolean(args.fileDek),
		],
		enabled:
			Boolean(pieceCid) && canDecrypt && isAuthed && args.enabled !== false,
		queryFn: async () => {
			if (!pieceCid || !args.dekSource) {
				throw new Error("pieceCid and dekSource required");
			}

			const list = await rpcQuery.files.comments.list.call({ pieceCid });
			if (list.comments.length === 0) return [];

			let dek = args.fileDek;
			if (!dek) {
				if (!wallet?.account) throw new Error("Wallet required");
				const walletAddress = walletAccountAddress(wallet.account);
				const orgId = args.dekSource.organizationId?.trim();
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

			return decryptFileCommentsList({
				pieceCid,
				dek,
				comments: list.comments,
			});
		},
	});
}
