import { useCreateCheckoutSession } from "@filosign/react/billing";
import { useEffect, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { DeploymentBanner } from "@/src/lib/components/app/deployment-banner";
import { Loader } from "@/src/lib/components/ui/loader";
import { SidebarInset, SidebarProvider } from "@/src/lib/components/ui/sidebar";
import { TooltipProvider } from "@/src/lib/components/ui/tooltip";
import DashboardNav from "./dashboard-nav";
import { DashboardSidebar } from "./dashboard-sidebar";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const account = useActiveAccount();
	const { mutateAsync: createCheckoutSession, isPending: isCheckingOut } =
		useCreateCheckoutSession();
	const [hasTriggered, setHasTriggered] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined" || !account || hasTriggered) return;

		const params = new URLSearchParams(window.location.search);
		const upgradePlan = params.get("upgrade");
		const interval = params.get("interval") || "monthly";

		if (
			upgradePlan === "individual" ||
			upgradePlan === "teams" ||
			upgradePlan === "teams_pro"
		) {
			setHasTriggered(true);

			// Clean URL params to prevent repeated triggers
			const cleanUrl = window.location.pathname;
			window.history.replaceState({}, "", cleanUrl);

			createCheckoutSession({
				planId: upgradePlan as "individual" | "teams" | "teams_pro",
				interval: interval as "monthly" | "yearly",
				returnUrl: `${window.location.origin}/dashboard`,
			})
				.then((res) => {
					if (res?.checkoutUrl) {
						window.location.href = res.checkoutUrl;
					}
				})
				.catch((err) => {
					console.error("Failed to initiate checkout session:", err);
				});
		}
	}, [account, createCheckoutSession, hasTriggered]);

	return (
		<TooltipProvider delay={200}>
			<DeploymentBanner />
			{isCheckingOut && (
				<div className="fixed inset-0 z-100 bg-background/80 backdrop-blur-xs flex items-center justify-center">
					<Loader text="Preparing your secure checkout..." />
				</div>
			)}
			<SidebarProvider defaultOpen>
				<DashboardSidebar />
				<SidebarInset className="flex min-h-svh w-full flex-col bg-background">
					<DashboardNav />
					<section
						id="dashboard-content"
						className="flex flex-1 flex-col gap-4"
					>
						{children}
					</section>
				</SidebarInset>
			</SidebarProvider>
		</TooltipProvider>
	);
}
