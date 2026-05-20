import type { ColdInviteEntrySearch } from "@/src/lib/domains/invites/cold-invite-search";
import {
	hasColdReturn,
	signDocumentSearchFromColdEntry,
} from "@/src/lib/domains/invites/cold-invite-search";

/** Post sign-in destination when wallet is registered. */
export function getPostAuthDashboardPath(search: ColdInviteEntrySearch):
	| {
			to: "/dashboard/document/sign";
			search: { pieceCid: string; invite: string };
	  }
	| {
			to: "/dashboard";
	  } {
	const signSearch = signDocumentSearchFromColdEntry(search);
	if (signSearch) {
		return { to: "/dashboard/document/sign", search: signSearch };
	}
	return { to: "/dashboard" };
}

export function hasAuthenticatedColdReturn(
	search: ColdInviteEntrySearch,
): boolean {
	return hasColdReturn(search);
}
