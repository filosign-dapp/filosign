import {
	createFileRoute,
	useNavigate,
	useSearch,
} from "@tanstack/react-router";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import Logo from "@/src/lib/components/shared/Logo";
import { useStorePersist } from "@/src/lib/hooks/use-store";
import { coldInviteEntrySearchSchema } from "@/src/lib/routing/cold-invite-search";
import type { OnboardingNamePayload } from "./-components/OnboardingNameForm";
import { OnboardingNameForm } from "./-components/OnboardingNameForm";
import OnboardingProtector from "./-components/OnboardingProtector";
import { OnboardingSwitchAccountLink } from "./-components/OnboardingSwitchAccountLink";
import { RecoveryPhraseDialog } from "./-components/RecoveryPhraseDialog";
import { useOnboardingKeyRegistration } from "./-lib/hooks/useOnboardingKeyRegistration";
import { useOnboardingRegisteredGuestRedirect } from "./-lib/hooks/useOnboardingRegisteredGuestRedirect";
import { buildWelcomeSearchFromOnboardingEntry } from "./-lib/utils/build-welcome-search";

function OnboardingPage() {
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
		navigate({
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

	return (
		<OnboardingProtector allowRegistered={registrationStarted}>
			<div className="flex justify-center items-center min-h-screen bg-background">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.3, delay: 0.2 }}
					className="flex flex-col justify-center items-center px-8 mx-auto w-full max-w-lg"
				>
					<Logo
						className="mb-4"
						textClassName="text-foreground font-semibold"
					/>
					<OnboardingNameForm
						onContinue={handleContinue}
						disabled={isRegistering}
					/>
					<OnboardingSwitchAccountLink />
				</motion.div>
			</div>
			<RecoveryPhraseDialog
				phrase={recoveryPhrase}
				onConfirmSaved={handlePhraseSaved}
			/>
		</OnboardingProtector>
	);
}

export const Route = createFileRoute("/onboarding/")({
	validateSearch: coldInviteEntrySearchSchema,
	component: OnboardingPage,
});
