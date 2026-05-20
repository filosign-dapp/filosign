import { createContext, useContext } from "react";
import type { useOnboardingEntryController } from "@/src/routes/onboarding/-lib/hooks/use-onboarding-entry-controller";

type OnboardingEntryController = ReturnType<
	typeof useOnboardingEntryController
>;

const OnboardingEntryContext = createContext<OnboardingEntryController | null>(
	null,
);

export function OnboardingEntryProvider({
	value,
	children,
}: {
	value: OnboardingEntryController;
	children: React.ReactNode;
}) {
	return (
		<OnboardingEntryContext.Provider value={value}>
			{children}
		</OnboardingEntryContext.Provider>
	);
}

export function useOnboardingEntry(): OnboardingEntryController {
	const context = useContext(OnboardingEntryContext);
	if (!context) {
		throw new Error(
			"useOnboardingEntry must be used within OnboardingEntryProvider",
		);
	}
	return context;
}
