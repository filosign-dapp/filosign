import { CaretRightIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import Logo from "@/src/lib/components/app/chrome/logo";
import { Button } from "@/src/lib/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/src/lib/components/ui/card";
import { useOnboardingWelcome } from "@/src/routes/onboarding/-lib/context/onboarding-welcome-context";

export function OnboardingWelcomePage() {
	const { userName, handleSubmit, ctaLabel } = useOnboardingWelcome();
	const firstName = userName.split(" ")[0] || "there";

	return (
		<div className="flex justify-center items-center min-h-screen">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3, delay: 0.2 }}
				className="flex flex-col justify-center items-center px-8 mx-auto w-full max-w-lg"
			>
				<Logo className="mb-4" textClassName="text-foreground font-semibold" />
				<Card className="w-full">
					<CardHeader>
						<CardTitle>All Set, {firstName}!</CardTitle>
						<CardDescription>Your Filosign account is ready.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<Button
							className="w-full group"
							variant="primary"
							onClick={() => void handleSubmit()}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									void handleSubmit();
								}
							}}
						>
							{ctaLabel}
							<CaretRightIcon
								className="transition-transform duration-200 size-4 group-hover:translate-x-1"
								weight="bold"
							/>
						</Button>
					</CardContent>
				</Card>
			</motion.div>
		</div>
	);
}
