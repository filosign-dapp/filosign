import { MotionReveal } from "@filosign/motion";
import { Form } from "@/src/lib/components/ui/form";
import { useProfileSettingsContext } from "../-lib/context/context";
// import { LinkedAccountsSection } from "./LinkedAccountsSection";
import { PersonalInfoSection } from "./PersonalInfoSection";
import { ProfileBillingSection } from "./profile-billing-section";
import { ThemeSection } from "./ThemeSection";
import { WalletUsdcBalanceCard } from "./WalletUsdcBalanceCard";

export function ProfileSettingsPage() {
	const { form } = useProfileSettingsContext();

	return (
		<div className="mx-auto w-full max-w-3xl space-y-8 px-6 py-8 sm:px-8">
			<header className="border-b border-border/80 pb-6">
				<div className="flex items-center justify-between gap-4">
					<h1 className="text-balance text-2xl font-medium tracking-tight text-foreground">
						Profile
					</h1>
				</div>
				<p className="mt-3 text-pretty text-sm text-muted-foreground">
					Manage your personal details, connected authentication profiles,
					visual appearance, and wallet balance.
				</p>
			</header>

			<Form {...form}>
				<form onSubmit={(e) => e.preventDefault()}>
					<MotionReveal
						preset="soft"
						delay={0.2}
						onlyOnce
						id="profile-settings-reveal"
						className="space-y-6 w-full"
					>
						<WalletUsdcBalanceCard />
						<ProfileBillingSection />
						<PersonalInfoSection />
						{/* <LinkedAccountsSection /> */}
						<ThemeSection />
					</MotionReveal>
				</form>
			</Form>
		</div>
	);
}
