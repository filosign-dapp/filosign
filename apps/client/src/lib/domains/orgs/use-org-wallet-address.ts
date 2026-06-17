import { useActiveOrgId, useOrganizationGet } from "@filosign/react/orgs";

/** Linked treasury from `orgs.get` (authoritative; `listMine` can be stale). */
export function useOrgWalletAddress(): string | null | undefined {
	const activeOrgId = useActiveOrgId();
	const orgDetail = useOrganizationGet(activeOrgId ?? undefined);
	return orgDetail.data?.organization.orgWalletAddress;
}
