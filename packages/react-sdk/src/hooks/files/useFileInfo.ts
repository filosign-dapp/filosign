import type { InferClientOutputs } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";

export type FileInfo =
	InferClientOutputs<AppRouterClient>["files"]["piece"]["detail"];

export type MySupplementaryPacketRow = NonNullable<
	FileInfo["mySupplementaryPackets"]
>[number];

export type UseFileInfoOptions = {
	pieceCid: string | undefined;
	/** Poll while viewer has locked supplementary packets (sign page unlock UX). */
	refetchWhileSupplementaryPacketsLocked?: boolean;
};

const SUPPLEMENTARY_PACKET_POLL_MS = 12_000;

export function useFileInfo(args: UseFileInfoOptions) {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const pieceCid = args.pieceCid;

	return useQuery({
		...rpcQuery.files.piece.detail.queryOptions({
			input: { pieceCid: pieceCid ?? "" },
		}),
		enabled: isAuthed && !!pieceCid,
		refetchInterval: (query) => {
			if (!args.refetchWhileSupplementaryPacketsLocked) {
				return false;
			}
			const hasLocked = query.state.data?.mySupplementaryPackets?.some(
				(packet) => !packet.unlocked,
			);
			return hasLocked ? SUPPLEMENTARY_PACKET_POLL_MS : false;
		},
	});
}
