import { motion } from "motion/react";
import Logo from "@/src/lib/components/app/chrome/logo";
import { OnboardingNameForm } from "@/src/routes/onboarding/-components/OnboardingNameForm";
import OnboardingProtector from "@/src/routes/onboarding/-components/OnboardingProtector";
import { OnboardingSwitchAccountLink } from "@/src/routes/onboarding/-components/OnboardingSwitchAccountLink";
import { RecoveryPhraseDialog } from "@/src/routes/onboarding/-components/RecoveryPhraseDialog";
import { useOnboardingEntry } from "@/src/routes/onboarding/-lib/context/onboarding-entry-context";

export function OnboardingEntryPage() {
	const {
		registrationStarted,
		isRegistering,
		recoveryPhrase,
		handleContinue,
		handlePhraseSaved,
	} = useOnboardingEntry();

	return (
		<OnboardingProtector allowRegistered={registrationStarted}>
			<div className="flex justify-center items-center min-h-screen bg-background">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.3, delay: 0.2 }}
					className="flex flex-col justify-center items-center px-8 mx-auto w-full max-w-lg"
				>
					<Logo className="mb-4" textClassName="text-foreground" />
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
