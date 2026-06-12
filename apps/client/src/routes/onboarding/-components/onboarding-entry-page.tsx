import { motion, SPRING_TOKENS } from "@filosign/motion";
import {
	FeatureShell,
	FeatureShellHeader,
	FeatureShellMedia,
	FeatureShellPanel,
} from "@/src/lib/components/ui/feature-shell";
import { OnboardingNameForm } from "@/src/routes/onboarding/-components/OnboardingNameForm";
import OnboardingProtector from "@/src/routes/onboarding/-components/OnboardingProtector";
import { OnboardingSwitchAccountLink } from "@/src/routes/onboarding/-components/OnboardingSwitchAccountLink";
import { useOnboardingEntry } from "@/src/routes/onboarding/-lib/context/onboarding-entry-context";
import { ONBOARDING_IMAGE } from "@/src/routes/onboarding/route";

export function OnboardingEntryPage() {
	const { isSubmitting, handleContinue } = useOnboardingEntry();

	return (
		<OnboardingProtector>
			<main className="relative flex min-h-dvh items-center justify-center px-4 py-8 sm:px-6">
				<motion.div
					initial={{ opacity: 0, y: 16, scale: 0.98 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					transition={SPRING_TOKENS.snappy}
					className="w-full max-w-[min(56rem,calc(100vw-2rem))]"
				>
					<FeatureShell>
						<FeatureShellMedia
							src={ONBOARDING_IMAGE}
							badge="Get started"
							width={640}
							height={480}
						/>

						<FeatureShellPanel>
							<FeatureShellHeader
								badge="Profile setup"
								title="Welcome aboard!"
								description="Enter your name to personalize your profile and workspace."
							/>
							<OnboardingNameForm
								onContinue={handleContinue}
								disabled={isSubmitting}
							/>
							<OnboardingSwitchAccountLink className="mt-6" />
						</FeatureShellPanel>
					</FeatureShell>
				</motion.div>
			</main>
		</OnboardingProtector>
	);
}
