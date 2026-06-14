import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PageBackdrop } from "@/src/lib/components/app/chrome/page-backdrop";
import { useOnboardingRegisteredGuestRedirect } from "@/src/routes/onboarding/-lib/hooks/use-onboarding-registered-guest-redirect";

export const ONBOARDING_IMAGE = "/images/ww/stock_44.webp";

function OnboardingLayout() {
	useOnboardingRegisteredGuestRedirect();

	return (
		<div className="relative isolate min-h-dvh overflow-hidden">
			<PageBackdrop src={ONBOARDING_IMAGE} />
			<div className="relative z-10 min-h-dvh">
				<Outlet />
			</div>
		</div>
	);
}

export const Route = createFileRoute("/onboarding")({
	component: OnboardingLayout,
});
