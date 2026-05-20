import { createFileRoute } from "@tanstack/react-router";
import { coldInviteEntrySearchSchema } from "@/src/lib/domains/invites/cold-invite-search";
import { OnboardingWelcomePage } from "@/src/routes/onboarding/-components/onboarding-welcome-page";
import { OnboardingWelcomeProvider } from "@/src/routes/onboarding/-lib/context/onboarding-welcome-context";
import { useOnboardingWelcomeController } from "@/src/routes/onboarding/-lib/hooks/use-onboarding-welcome-controller";

function OnboardingWelcomeRoutePage() {
	const controller = useOnboardingWelcomeController();
	return (
		<OnboardingWelcomeProvider value={controller}>
			<OnboardingWelcomePage />
		</OnboardingWelcomeProvider>
	);
}

export const Route = createFileRoute("/onboarding/welcome/")({
	validateSearch: coldInviteEntrySearchSchema,
	component: OnboardingWelcomeRoutePage,
});
