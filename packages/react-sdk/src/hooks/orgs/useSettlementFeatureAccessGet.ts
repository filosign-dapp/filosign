import type { InferClientOutputs } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";
import { useActiveOrgId } from "./useOrganizations";

export type SettlementFeatureAccessGetOutput =
	InferClientOutputs<AppRouterClient>["orgs"]["settlementFeatureAccess"]["get"];

export function useSettlementFeatureAccessGet(
	organizationId: string | undefined,
) {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const activeOrgId = useActiveOrgId();
	const nil = "00000000-0000-0000-0000-000000000000";

	return useQuery({
		...rpcQuery.orgs.settlementFeatureAccess.get.queryOptions({
			input: { organizationId: organizationId ?? nil },
		}),
		enabled: isAuthed && !!organizationId && organizationId === activeOrgId,
	});
}
