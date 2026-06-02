import { useSyncThirdwebEmail } from "@filosign/react/users";
import { useCallback } from "react";
import { useAuthToken } from "thirdweb/react";

/**
 * Reconcile DB primary email with thirdweb linked accounts.
 * Call after link/unlink - not on every app load (registration + setPrimaryEmail cover other paths).
 */
export function useReconcileThirdwebEmail() {
	const authToken = useAuthToken();
	const syncThirdwebEmail = useSyncThirdwebEmail();

	return useCallback(async () => {
		if (!authToken) return;
		await syncThirdwebEmail.mutateAsync({ identityToken: authToken });
	}, [authToken, syncThirdwebEmail]);
}
