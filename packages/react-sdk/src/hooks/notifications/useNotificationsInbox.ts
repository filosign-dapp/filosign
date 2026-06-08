import type { InferClientOutputs } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";

export type NotificationInboxItem =
	InferClientOutputs<AppRouterClient>["notifications"]["inbox"]["items"][number];

const INBOX_STALE_MS = 30_000;
const INBOX_REFETCH_INTERVAL_MS = 60_000;

export function useNotificationsInbox(args?: {
	limit?: number;
	enabled?: boolean;
}) {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const limit = args?.limit ?? 20;

	return useQuery({
		...rpcQuery.notifications.inbox.queryOptions({
			input: { limit },
		}),
		enabled: (args?.enabled ?? true) && isAuthed,
		staleTime: INBOX_STALE_MS,
		refetchInterval: INBOX_REFETCH_INTERVAL_MS,
		refetchOnWindowFocus: true,
	});
}
