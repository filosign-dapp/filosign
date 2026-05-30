import type { DocumentViewSource } from "@filosign/shared";
import { useMutation } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useRecordDocumentView() {
	const { rpcQuery, isAuthed } = useFilosignRpc();

	return useMutation({
		mutationFn: async (args: {
			pieceCid: string;
			source?: DocumentViewSource;
		}) => {
			if (!isAuthed) {
				throw new Error("not connected");
			}
			return rpcQuery.files.piece.recordView.call({
				pieceCid: args.pieceCid,
				body: args.source ? { source: args.source } : {},
			});
		},
	});
}
