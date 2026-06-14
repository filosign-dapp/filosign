import { isPersonalizationComplete } from "@/src/lib/auth/account-defaults";
import {
	type ColdInviteEntrySearch,
	coldInviteEntrySearchSchema,
	type SignDocumentColdSearch,
} from "@/src/lib/domains/invites/cold-invite-search";

export type PostAuthDestination =
	| { type: "pending" }
	| { type: "onboarding"; search: ColdInviteEntrySearch }
	| { type: "sign"; search: SignDocumentColdSearch }
	| {
			type: "dashboard";
			search: { upgrade?: string; interval?: string };
	  };

export type NavigablePostAuthDestination = Exclude<
	PostAuthDestination,
	{ type: "pending" }
>;

type PostAuthNavigateOptions = {
	replace?: boolean;
};

type PostAuthNavigateArg =
	| { to: "/onboarding"; search: ColdInviteEntrySearch; replace?: boolean }
	| {
			to: "/dashboard/document/sign";
			search: SignDocumentColdSearch;
			replace?: boolean;
	  }
	| {
			to: "/dashboard";
			search: { upgrade?: string; interval?: string };
			replace?: boolean;
	  };

type PostAuthNavigateFn = (
	options: PostAuthNavigateArg,
) => void | Promise<void>;

/** Preserve cold-invite (and billing) params on the onboarding route. */
export function onboardingSearchFromColdEntry(
	search: ColdInviteEntrySearch,
): ColdInviteEntrySearch {
	return coldInviteEntrySearchSchema.parse(search);
}

export function onboardingSearchFromSignDocument(
	sign: SignDocumentColdSearch,
): ColdInviteEntrySearch {
	return coldInviteEntrySearchSchema.parse({
		coldPieceCid: sign.pieceCid,
		coldInvite: sign.invite,
	});
}

export function resolvePostAuthDestination(args: {
	coldSearch: ColdInviteEntrySearch;
	signSearch: SignDocumentColdSearch | null;
	profile: { firstName?: string | null } | undefined;
	profilePending: boolean;
}): PostAuthDestination {
	if (args.profilePending) return { type: "pending" };

	if (!isPersonalizationComplete(args.profile)) {
		return {
			type: "onboarding",
			search: onboardingSearchFromColdEntry(args.coldSearch),
		};
	}

	if (args.signSearch) {
		return { type: "sign", search: args.signSearch };
	}

	return {
		type: "dashboard",
		search: {
			upgrade: args.coldSearch.upgrade,
			interval: args.coldSearch.interval,
		},
	};
}

export function postAuthDestinationKey(
	destination: NavigablePostAuthDestination,
): string {
	switch (destination.type) {
		case "onboarding":
			return `onboarding:${destination.search.coldPieceCid}:${destination.search.coldInvite}:${destination.search.skipColdSign}:${destination.search.upgrade ?? ""}:${destination.search.interval ?? ""}`;
		case "sign":
			return `sign:${destination.search.pieceCid}:${destination.search.invite}`;
		case "dashboard":
			return `dashboard:${destination.search.upgrade ?? ""}:${destination.search.interval ?? ""}`;
	}
}

export async function navigatePostAuthDestination(
	navigate: PostAuthNavigateFn,
	destination: NavigablePostAuthDestination,
	options?: PostAuthNavigateOptions,
): Promise<void> {
	const replace = options?.replace ?? false;

	switch (destination.type) {
		case "onboarding":
			await navigate({
				to: "/onboarding",
				search: destination.search,
				replace,
			});
			return;
		case "sign":
			await navigate({
				to: "/dashboard/document/sign",
				search: destination.search,
				replace,
			});
			return;
		case "dashboard":
			await navigate({
				to: "/dashboard",
				search: destination.search,
				replace,
			});
	}
}
