import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PageBackdrop } from "@/src/lib/components/app/chrome/page-backdrop";

export const ONBOARDING_IMAGE = "/images/stock_14.webp";

function OnboardingLayout() {
	return (
		<div className="relative isolate min-h-dvh overflow-hidden">
			<PageBackdrop src={ONBOARDING_IMAGE} />
			<div className="relative z-10 min-h-dvh">
				<Outlet />
			</div>
		</div>
	);
}

/** Onboarding layout; per-route protectors handle registered-user redirects. */
export const Route = createFileRoute("/onboarding")({
	component: OnboardingLayout,
});
