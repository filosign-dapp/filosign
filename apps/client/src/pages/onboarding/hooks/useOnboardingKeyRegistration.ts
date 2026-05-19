import { useLogin } from "@filosign/react/auth";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useAuthToken } from "thirdweb/react";

export function useOnboardingKeyRegistration() {
	const authToken = useAuthToken();
	const login = useLogin();
	const [recoveryPhrase, setRecoveryPhrase] = useState<string | null>(null);

	const registerKeys = useCallback(async () => {
		if (!authToken) {
			toast.error(
				"Wallet session not ready. Sign in again, then retry registration.",
			);
			return { ok: false as const };
		}
		try {
			const result = await login.mutateAsync({ idToken: authToken });
			if (
				result &&
				typeof result === "object" &&
				"recoveryPhrase" in result &&
				typeof result.recoveryPhrase === "string"
			) {
				setRecoveryPhrase(result.recoveryPhrase);
				return { ok: true as const, hadPhrase: true };
			}
			setRecoveryPhrase(null);
			return { ok: true as const, hadPhrase: false };
		} catch {
			toast.error("Registration failed. Try again.");
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
