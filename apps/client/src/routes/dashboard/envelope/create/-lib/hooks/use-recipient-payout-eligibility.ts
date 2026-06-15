import { useBasicPayoutAttachGate } from "@filosign/react/files";
import { useUserProfileByQuery } from "@filosign/react/users";
import { isAddress } from "viem";
import {
	isValidRecipientEmail,
	recipientLookupEmail,
} from "@/src/lib/domains/invites/recipient-email";
import { recipientMatchesSelfProfile } from "@/src/lib/domains/placement/utils/self-signer";
import { useDebouncedSearch } from "@/src/lib/utils/use-debounced-search";
import { RECIPIENT_LOOKUP_DEBOUNCE_MS } from "@/src/routes/dashboard/envelope/create/-lib/constants/recipient-card";
import { useComposeSelfProfile } from "@/src/routes/dashboard/envelope/create/-lib/hooks/use-compose-self-profile";
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";

export function useRecipientPayoutEligibility(
	recipient: Recipient | undefined,
) {
	const { canAttach: settlementBasicAllowed } = useBasicPayoutAttachGate();
	const selfProfile = useComposeSelfProfile();

	const emailTrimmed = recipient?.email.trim() ?? "";
	const emailValid =
		emailTrimmed.length > 0 && isValidRecipientEmail(emailTrimmed);
	const lookupEmail = recipientLookupEmail(emailTrimmed);

	const { debouncedSearch: debouncedLookupEmail, isSettled: lookupSettled } =
		useDebouncedSearch(lookupEmail, RECIPIENT_LOOKUP_DEBOUNCE_MS);

	const profileQuery = useUserProfileByQuery({ email: debouncedLookupEmail });
	const profile = profileQuery.data;
	const isFilosignRecipient =
		lookupSettled && profileQuery.isSuccess && !!profile;

	const isSelfRecipient = recipient
		? recipientMatchesSelfProfile(recipient, selfProfile)
		: false;

	const canAttachPayout =
		settlementBasicAllowed &&
		isFilosignRecipient &&
		!!profile?.walletAddress &&
		isAddress(profile.walletAddress) &&
		!isSelfRecipient;

	return {
		emailValid,
		debouncedLookupEmail,
		lookupSettled,
		isFilosignRecipient,
		isSelfRecipient,
		canAttachPayout,
		profile,
		profileQuery,
	};
}
