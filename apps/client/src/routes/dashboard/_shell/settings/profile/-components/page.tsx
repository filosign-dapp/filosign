import { CaretLeftIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
	FullBleedMain,
	FullBleedPageHeader,
} from "@/src/lib/components/app/chrome/full-bleed-page-header";
import Logo from "@/src/lib/components/app/chrome/logo";
import { Button } from "@/src/lib/components/ui/button";
import { Form } from "@/src/lib/components/ui/form";
import { useProfileSettingsContext } from "../-lib/context/context";
import { LinkedAccountsSection } from "./LinkedAccountsSection";
import { PersonalInfoSection } from "./PersonalInfoSection";
import { WalletUsdcBalanceCard } from "./WalletUsdcBalanceCard";

export function ProfileSettingsPage() {
	const { form } = useProfileSettingsContext();

	return (
		<div className="min-h-screen">
			<FullBleedPageHeader>
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
			</FullBleedPageHeader>

			<Form {...form}>
				<form>
					<FullBleedMain className="max-w-xl space-y-8 flex flex-col items-center justify-center">
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
							<PersonalInfoSection />
							<LinkedAccountsSection />
						</motion.div>
					</FullBleedMain>
				</form>
			</Form>
		</div>
	);
}
