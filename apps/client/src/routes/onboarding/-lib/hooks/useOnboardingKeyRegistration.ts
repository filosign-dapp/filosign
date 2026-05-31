import { useLogin } from "@filosign/react/auth";
import { useCallback, useState } from "react";
import { useAuthToken } from "thirdweb/react";
import {
	clearStoredAccessGate,
	readStoredAccessGate,
} from "@/src/lib/web3/platform-access-session";

export function useOnboardingKeyRegistration() {
	const authToken = useAuthToken();
	const login = useLogin();
	const [recoveryPhrase, setRecoveryPhrase] = useState<string | null>(null);

	const registerKeys = useCallback(async () => {
		if (!authToken) {
			return { ok: false as const };
		}
		try {
			const result = await login.mutateAsync({
				idToken: authToken,
				accessGate: readStoredAccessGate() ?? undefined,
			});
			if (
				result &&
				typeof result === "object" &&
				"recoveryPhrase" in result &&
				typeof result.recoveryPhrase === "string"
			) {
				setRecoveryPhrase(result.recoveryPhrase);
				clearStoredAccessGate();
				return { ok: true as const, hadPhrase: true };
			}
			setRecoveryPhrase(null);
			clearStoredAccessGate();
			return { ok: true as const, hadPhrase: false };
		} catch {
			return { ok: false as const };
		}
	}, [authToken, login]);

	const clearRecoveryPhrase = useCallback(() => {
		setRecoveryPhrase(null);
	}, []);

	return {
		registerKeys,
		isRegistering: login.isPending,
		recoveryPhrase,
		clearRecoveryPhrase,
	};
}
