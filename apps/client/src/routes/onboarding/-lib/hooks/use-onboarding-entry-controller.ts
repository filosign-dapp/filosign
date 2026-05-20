import { useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import type { OnboardingNamePayload } from "@/src/routes/onboarding/-components/OnboardingNameForm";
import { useOnboardingComplete } from "@/src/routes/onboarding/-lib/hooks/use-onboarding-complete";
import { useOnboardingKeyRegistration } from "@/src/routes/onboarding/-lib/hooks/useOnboardingKeyRegistration";
import { useOnboardingRegisteredGuestRedirect } from "@/src/routes/onboarding/-lib/hooks/useOnboardingRegisteredGuestRedirect";

export function useOnboardingEntryController() {
	const [registrationStarted, setRegistrationStarted] = useState(false);
	const search = useSearch({ from: "/onboarding/" });
	const { setOnboardingForm } = useStorePersist();
	const { registerKeys, isRegistering, recoveryPhrase, clearRecoveryPhrase } =
		useOnboardingKeyRegistration();
	const completeOnboarding = useOnboardingComplete();

	useOnboardingRegisteredGuestRedirect({
		registrationStarted,
		recoveryPhrase,
	});

	const finishRegistration = async () => {
		await completeOnboarding(search);
	};

	const handleContinue = async (names: OnboardingNamePayload) => {
		setRegistrationStarted(true);
		setOnboardingForm({
			firstName: names.firstName,
			lastName: names.lastName,
			hasOnboarded: false,
		});

		const outcome = await registerKeys();
		if (!outcome.ok) {
			setRegistrationStarted(false);
			return;
		}
		if (!outcome.hadPhrase) {
			await finishRegistration();
		}
	};

	const handlePhraseSaved = () => {
		clearRecoveryPhrase();
		void finishRegistration();
	};

	return {
		registrationStarted,
		isRegistering,
		recoveryPhrase,
		handleContinue,
		handlePhraseSaved,
	};
}
