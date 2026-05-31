import type { InferClientOutputs } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import { DAY } from "../../constants";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";
import { useActiveOrgId } from "../orgs/useOrganizations";

export type EntitlementsSnapshot =
	InferClientOutputs<AppRouterClient>["billing"]["entitlements"];

export function useEntitlements() {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const activeOrgId = useActiveOrgId();

	return useQuery({
		...rpcQuery.billing.entitlements.queryOptions(),
		queryKey: [...rpcQuery.billing.entitlements.key(), activeOrgId],
		enabled: isAuthed && Boolean(activeOrgId),
		staleTime: 1 * DAY,
	});
}
