import type { InferClientOutputs } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";
import { useActiveOrgId } from "../orgs/useOrganizations";

export type OrgFileRow =
	InferClientOutputs<AppRouterClient>["files"]["list"]["org"]["files"][number];

export function useOrgFiles() {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const activeOrgId = useActiveOrgId();
	return useQuery({
		...rpcQuery.files.list.org.queryOptions(),
		enabled: isAuthed && Boolean(activeOrgId),
		select: (data) => data.files,
	});
}
