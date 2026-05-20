import { motion } from "motion/react";
import { CreateNewSignaturePage } from "@/src/routes/dashboard/signature/create/index";
import OnboardingProtector from "../-components/OnboardingProtector";

function OnboardingCreateSignaturePage() {
	return (
		<OnboardingProtector>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3, delay: 0.3 }}
			>
				<CreateNewSignaturePage onboarding={true} />
			</motion.div>
		</OnboardingProtector>
	);
}

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/onboarding/create-signature/")({
	component: OnboardingCreateSignaturePage,
});
