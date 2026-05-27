import { MotionReveal, Pressable } from "@filosign/motion";
import { CaretLeftIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { FullBleedMain } from "@/src/lib/components/app/chrome/full-bleed-page-header";
import { Button } from "@/src/lib/components/ui/button";
import { Form } from "@/src/lib/components/ui/form";
import { useProfileSettingsContext } from "../-lib/context/context";
import { LinkedAccountsSection } from "./LinkedAccountsSection";
import { PersonalInfoSection } from "./PersonalInfoSection";
import { WalletUsdcBalanceCard } from "./WalletUsdcBalanceCard";

export function ProfileSettingsPage() {
	const { form } = useProfileSettingsContext();

	return (
		<div className="min-h-full">
			<Form {...form}>
				<form>
					<FullBleedMain className="max-w-xl space-y-8 flex flex-col items-center justify-center">
						<Pressable preset="snappy">
							<Button
								variant="ghost"
								size="lg"
								className="self-start mb-4"
								render={<Link to="/dashboard" />}
							>
								<CaretLeftIcon className="size-5" weight="bold" />
								<p>Back</p>
							</Button>
						</Pressable>

						<WalletUsdcBalanceCard />

						<MotionReveal
							preset="soft"
							delay={0.2}
							onlyOnce
							id="profile-settings"
							className="space-y-8 w-full"
						>
							<PersonalInfoSection />
							<LinkedAccountsSection />
						</MotionReveal>
					</FullBleedMain>
				</form>
			</Form>
		</div>
	);
}
