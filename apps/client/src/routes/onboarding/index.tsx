import { createFileRoute } from "@tanstack/react-router";
import { coldInviteEntrySearchSchema } from "@/src/lib/domains/invites/cold-invite-search";
import { OnboardingEntryPage } from "@/src/routes/onboarding/-components/onboarding-entry-page";
import { OnboardingEntryProvider } from "@/src/routes/onboarding/-lib/context/onboarding-entry-context";
import { useOnboardingEntryController } from "@/src/routes/onboarding/-lib/hooks/use-onboarding-entry-controller";

function OnboardingRoutePage() {
	const controller = useOnboardingEntryController();
	return (
		<OnboardingEntryProvider value={controller}>
			<OnboardingEntryPage />
		</OnboardingEntryProvider>
	);
}

export const Route = createFileRoute("/onboarding/")({
	validateSearch: coldInviteEntrySearchSchema,
	component: OnboardingRoutePage,
});
