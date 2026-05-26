import type { InferClientOutputs } from "@orpc/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { useFilosignContext } from "../../context/useFilosignContext";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";

export type OrgListItem =
	InferClientOutputs<AppRouterClient>["orgs"]["listMine"]["organizations"][number];

export function useOrganizations() {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	return useQuery({
		...rpcQuery.orgs.listMine.queryOptions(),
		enabled: isAuthed,
	});
}

export function useActiveOrgId() {
	const { session } = useFilosignContext();
	return useSyncExternalStore(
		session.subscribeActiveOrgId,
		() => session.getActiveOrgId(),
		() => null,
	);
}

export function useSetActiveOrgId() {
	const { session } = useFilosignContext();
	const queryClient = useQueryClient();
	return (orgId: string | null) => {
		session.setActiveOrgId(orgId);
		void queryClient.invalidateQueries();
	};
}
