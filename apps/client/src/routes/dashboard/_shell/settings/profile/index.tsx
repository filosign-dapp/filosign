import { CaretLeftIcon } from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import Logo from "@/src/lib/components/shared/Logo";
import { Button } from "@/src/lib/components/ui/button";
import { Form } from "@/src/lib/components/ui/form";
import { LinkedAccountsSection } from "./-components/LinkedAccountsSection";
import { PersonalInfoSection } from "./-components/PersonalInfoSection";
import { WalletUsdcBalanceCard } from "./-components/WalletUsdcBalanceCard";
import { useProfileSettings } from "./-lib/hooks/use-profile-settings";

function ProfilePage() {
	const { form, personalSection } = useProfileSettings();

	return (
		<div className="min-h-screen">
			<header className="flex sticky top-0 z-50 justify-between items-center px-8 h-16 border-b glass bg-background/50 border-border">
				<div className="flex gap-4 items-center">
					<Logo
						className="px-0"
						textClassName="text-foreground font-bold"
						iconOnly
					/>
					<motion.h3
						initial={{ opacity: 0, x: -10 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{
							type: "spring",
							stiffness: 200,
							damping: 25,
							delay: 0.1,
						}}
					>
						Profile Settings
					</motion.h3>
				</div>
			</header>

			<Form {...form}>
				<form>
					<main className="p-8 mx-auto max-w-xl space-y-8 flex flex-col items-center justify-center min-h-[calc(100dvh-4rem)]">
						<Button
							variant="ghost"
							size="lg"
							className="self-start mb-4"
							render={<Link to="/dashboard" />}
						>
							<CaretLeftIcon className="size-5" weight="bold" />
							<p>Back</p>
						</Button>

						<WalletUsdcBalanceCard />

						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{
								type: "spring",
								stiffness: 200,
								damping: 25,
								delay: 0.2,
							}}
							className="space-y-8 w-full"
						>
							<PersonalInfoSection form={form} sectionState={personalSection} />
							<LinkedAccountsSection />
						</motion.div>
					</main>
				</form>
			</Form>
		</div>
	);
}

export const Route = createFileRoute("/dashboard/_shell/settings/profile/")({
	component: ProfilePage,
});
