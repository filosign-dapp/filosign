import type { InferClientInputs } from "@orpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateNotificationsInbox } from "../../lib/invalidate-queries";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";

export type NotificationsDismissInput =
	InferClientInputs<AppRouterClient>["notifications"]["dismiss"];

export function useNotificationsDismiss() {
	const { rpcQuery } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: NotificationsDismissInput) =>
			rpcQuery.notifications.dismiss.call(input),
		onSuccess: () => {
			void invalidateNotificationsInbox(queryClient, rpcQuery);
		},
	});
}
