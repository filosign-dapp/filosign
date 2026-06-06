import { useSearch } from "@tanstack/react-router";
import { useState } from "react";
import type { OnboardingNamePayload } from "@/src/routes/onboarding/-components/OnboardingNameForm";
import { useOnboardingComplete } from "@/src/routes/onboarding/-lib/hooks/use-onboarding-complete";
import { useOnboardingRegisteredGuestRedirect } from "@/src/routes/onboarding/-lib/hooks/use-onboarding-registered-guest-redirect";

export function useOnboardingEntryController() {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const search = useSearch({ from: "/onboarding/" });
	const completeOnboarding = useOnboardingComplete();

	useOnboardingRegisteredGuestRedirect();

	const handleContinue = async (names: OnboardingNamePayload) => {
		setIsSubmitting(true);
		try {
			await completeOnboarding(search, names);
		} finally {
			setIsSubmitting(false);
		}
	};

	return {
		isSubmitting,
		handleContinue,
	};
}
