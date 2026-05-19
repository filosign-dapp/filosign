import { useSyncPrivyEmail, useUserProfile } from "@filosign/react/users";
import { useEffect, useRef } from "react";
import { useAuthToken } from "thirdweb/react";
import { useThirdwebConnection } from "@/src/lib/hooks/use-thirdweb-connection";

/** Syncs email from a verified thirdweb auth token when the user connects. */
export default function ProfileEmailSync() {
	const { authenticated } = useThirdwebConnection();
	const authToken = useAuthToken();
	const userProfile = useUserProfile();
	const syncPrivyEmail = useSyncPrivyEmail();
	const lastSyncedTokenRef = useRef<string | null>(null);

	useEffect(() => {
		if (!authenticated || !authToken || !userProfile.data) {
			return;
		}

		if (lastSyncedTokenRef.current === authToken) {
			return;
		}

		lastSyncedTokenRef.current = authToken;
		syncPrivyEmail.mutate({ identityToken: authToken });
	}, [
		authenticated,
		authToken,
		userProfile.data?.walletAddress,
		syncPrivyEmail,
	]);

	return null;
}
