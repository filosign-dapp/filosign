import type { InferClientOutputs } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";
import { useActiveOrgId } from "./useOrganizations";

export type OrgsGetOutput = InferClientOutputs<AppRouterClient>["orgs"]["get"];
export type OrgMemberRow = OrgsGetOutput["members"][number];
export type OrgTemplateSummary = OrgsGetOutput["templates"][number];

/** Requires `organizationId ===` active workspace (`X-Org-Id`). */
export function useOrganizationGet(organizationId: string | undefined) {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const activeOrgId = useActiveOrgId();
	const nil = "00000000-0000-0000-0000-000000000000";

	return useQuery({
		...rpcQuery.orgs.get.queryOptions({
			input: {
				organizationId: organizationId ?? nil,
			},
		}),
		enabled: isAuthed && !!organizationId && organizationId === activeOrgId,
	});
}
