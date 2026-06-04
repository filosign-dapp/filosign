import type { InferClientOutputs } from "@orpc/client";
import { useMutation } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";

export type ComplianceBundleResponse =
	InferClientOutputs<AppRouterClient>["files"]["piece"]["complianceBundle"];

export function useComplianceBundle() {
	const { rpcQuery, isAuthed } = useFilosignRpc();

	return useMutation({
		mutationFn: async (args: {
			pieceCid: string;
			exportKind?: "zip" | "pdf" | "json";
			documentSha256?: string | undefined;
		}): Promise<ComplianceBundleResponse> => {
			if (!isAuthed) throw new Error("Not authenticated");
			return rpcQuery.files.piece.complianceBundle.call({
				pieceCid: args.pieceCid,
				exportKind: args.exportKind ?? "pdf",
				...(args.documentSha256 !== undefined && args.documentSha256 !== ""
					? { documentSha256: args.documentSha256 }
					: {}),
			});
		},
	});
}
