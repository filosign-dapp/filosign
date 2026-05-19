import { useMemo } from "react";
import { useActiveAccount, useProfiles } from "thirdweb/react";
import { thirdwebClient } from "@/src/lib/thirdweb/client";
import { profileEmailsFromThirdwebProfiles } from "@/src/lib/thirdweb/profile-emails";

/** Wallet address + primary email from thirdweb linked profiles. */
export function useThirdwebUserInfo() {
	const account = useActiveAccount();
	const { data: profiles } = useProfiles({ client: thirdwebClient });

	const { email, googleEmail } = useMemo(
		() => profileEmailsFromThirdwebProfiles(profiles),
		[profiles],
	);

	const walletAddress = account?.address ?? "";

	const user = useMemo(() => {
		if (!account?.address) return null;
		return {
			wallet: { address: account.address },
			email: email ? { address: email } : undefined,
			google: googleEmail ? { email: googleEmail } : undefined,
		};
	}, [account?.address, email, googleEmail]);

	return {
		walletAddress,
		email,
		user,
	};
}
