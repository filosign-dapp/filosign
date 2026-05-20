import type { InferClientOutputs } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";

export type ReceivedFileRow =
	InferClientOutputs<AppRouterClient>["files"]["list"]["received"]["files"][number];

export function useReceivedFiles(options?: { enabled?: boolean }) {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const extraEnabled = options?.enabled ?? true;

	return useQuery({
		...rpcQuery.files.list.received.queryOptions(),
		enabled: isAuthed && extraEnabled,
		select: (data) => data.files,
	});
}
