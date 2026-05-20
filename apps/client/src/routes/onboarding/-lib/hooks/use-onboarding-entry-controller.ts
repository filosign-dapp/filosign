import { useNavigate, useSearch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import type { OnboardingNamePayload } from "@/src/routes/onboarding/-components/OnboardingNameForm";
import { useOnboardingKeyRegistration } from "@/src/routes/onboarding/-lib/hooks/useOnboardingKeyRegistration";
import { useOnboardingRegisteredGuestRedirect } from "@/src/routes/onboarding/-lib/hooks/useOnboardingRegisteredGuestRedirect";
import { buildWelcomeSearchFromOnboardingEntry } from "@/src/routes/onboarding/-lib/utils/build-welcome-search";

export function useOnboardingEntryController() {
	const [registrationStarted, setRegistrationStarted] = useState(false);
	const search = useSearch({ from: "/onboarding/" });
	const navigate = useNavigate();
	const { setOnboardingForm } = useStorePersist();
	const { registerKeys, isRegistering, recoveryPhrase, clearRecoveryPhrase } =
		useOnboardingKeyRegistration();

	useOnboardingRegisteredGuestRedirect({
		registrationStarted,
		recoveryPhrase,
	});

	const welcomeSearch = useMemo(
		() => buildWelcomeSearchFromOnboardingEntry(search),
		[search],
	);

	const goToWelcome = () => {
		void navigate({
			to: "/onboarding/welcome",
			search: welcomeSearch,
		});
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
			goToWelcome();
		}
	};

	const handlePhraseSaved = () => {
		clearRecoveryPhrase();
		goToWelcome();
	};

	return {
		registrationStarted,
		isRegistering,
		recoveryPhrase,
		handleContinue,
		handlePhraseSaved,
	};
}
