import {
	type ColdInviteEntrySearch,
	SKIP_COLD_SIGN_AFTER_MISMATCH,
	shouldSkipColdDocumentAfterMismatch,
} from "@/src/lib/routing/cold-invite-search";

export function buildWelcomeSearchFromOnboardingEntry(
	search: ColdInviteEntrySearch,
) {
	const cold =
		search.coldPieceCid?.trim() && search.coldInvite?.trim()
			? {
					coldPieceCid: search.coldPieceCid,
					coldInvite: search.coldInvite,
				}
			: undefined;
	return {
		...(cold ?? {}),
		...(shouldSkipColdDocumentAfterMismatch(search)
			? { skipColdSign: SKIP_COLD_SIGN_AFTER_MISMATCH }
			: {}),
	};
}
