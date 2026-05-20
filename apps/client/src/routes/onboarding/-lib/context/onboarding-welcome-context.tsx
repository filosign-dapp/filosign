import { createContext, useContext } from "react";
import type { useOnboardingWelcomeController } from "@/src/routes/onboarding/-lib/hooks/use-onboarding-welcome-controller";

type OnboardingWelcomeController = ReturnType<
	typeof useOnboardingWelcomeController
>;

const OnboardingWelcomeContext =
	createContext<OnboardingWelcomeController | null>(null);

export function OnboardingWelcomeProvider({
	value,
	children,
}: {
	value: OnboardingWelcomeController;
	children: React.ReactNode;
}) {
	return (
		<OnboardingWelcomeContext.Provider value={value}>
			{children}
		</OnboardingWelcomeContext.Provider>
	);
}

export function useOnboardingWelcome(): OnboardingWelcomeController {
	const context = useContext(OnboardingWelcomeContext);
	if (!context) {
		throw new Error(
			"useOnboardingWelcome must be used within OnboardingWelcomeProvider",
		);
	}
	return context;
}
