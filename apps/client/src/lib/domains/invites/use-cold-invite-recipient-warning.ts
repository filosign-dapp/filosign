import { useFilosignContext } from "@filosign/react";
import { useColdInvitePayload } from "@filosign/react/files";
import { useUserProfile } from "@filosign/react/users";
import { useRouterState } from "@tanstack/react-router";
import { useMemo } from "react";
import {
	coldInviteRecipientMatchesIdentity,
	parseColdInviteFromLocationSearch,
} from "@/src/lib/domains/invites/cold-invite-search";
import { useThirdwebConnection } from "@/src/lib/web3/hooks/use-thirdweb-connection";
import { useThirdwebUserInfo } from "@/src/lib/web3/hooks/use-thirdweb-user-info";

/**
 * When the URL carries a cold-invite token and the user is logged in, compares wallet
 * (email + Google) and Filosign profile email to invite recipients (and sender wallet).
 */
export function useColdInviteRecipientWarning() {
	const searchKey = useRouterState({
		select: (s) => JSON.stringify(s.location.search ?? {}),
	});
	const cold = useMemo(() => {
		try {
			const raw = JSON.parse(searchKey) as Record<string, unknown>;
			const coldPieceCid = String(raw.coldPieceCid ?? "").trim();
			const coldInvite = String(raw.coldInvite ?? "").trim();
			if (coldPieceCid && coldInvite) {
				return { coldPieceCid, coldInvite };
			}
			const pieceCid = String(raw.pieceCid ?? "").trim();
			const invite = String(raw.invite ?? "").trim();
			if (pieceCid && invite) {
				return { coldPieceCid: pieceCid, coldInvite: invite };
			}
		} catch {
			/* fall through */
		}
		return parseColdInviteFromLocationSearch(
			typeof window !== "undefined" ? window.location.search : "",
		);
	}, [searchKey]);
	const inviteToken = cold?.coldInvite;

	const { authenticated } = useThirdwebConnection();
	const { user, email: walletEmail } = useThirdwebUserInfo();
	const { data: userProfile } = useUserProfile({ enabled: authenticated });
	const { wallet } = useFilosignContext();

	const { data: invite, isSuccess } = useColdInvitePayload(inviteToken);

	const loggedInEmail = useMemo(
		() =>
			walletEmail ||
			user?.email?.address?.trim() ||
			user?.google?.email?.trim() ||
			"",
		[walletEmail, user?.email?.address, user?.google?.email],
	);

	const signedInEmailForUi = loggedInEmail || userProfile?.email?.trim() || "";

	const inviteMatches = useMemo(() => {
		if (!invite) return false;
		return coldInviteRecipientMatchesIdentity({
			recipientEmails: invite.recipientEmails,
			loggedInEmail,
			profileEmail: userProfile?.email,
			senderWallet: wallet?.account?.address,
			inviteSender: invite.sender,
		});
	}, [invite, loggedInEmail, userProfile?.email, wallet?.account?.address]);

	const showWarning =
		Boolean(inviteToken && inviteToken.length >= 8) &&
		authenticated &&
		isSuccess &&
		!!invite &&
		invite.recipientEmails.length > 0 &&
		!inviteMatches;

	return {
		showWarning,
		invite,
		signedInEmailForUi,
		recipientEmails: invite?.recipientEmails ?? [],
	};
}
