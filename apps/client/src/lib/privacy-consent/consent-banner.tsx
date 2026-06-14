import env from "@/src/env";
import { Button } from "@/src/lib/components/ui/button";
import { analyticsPrivacyPolicyUrl } from "./policy";

export function AnalyticsConsentBanner({
	needsConsent,
	onAccept,
	onDecline,
}: {
	needsConsent: boolean;
	onAccept: () => void;
	onDecline: () => void;
}) {
	if (!needsConsent) return null;

	const privacyUrl = analyticsPrivacyPolicyUrl(env.VITE_ASTRO_URL);

	return (
		<div
			role="dialog"
			aria-label="Analytics consent"
			className="fixed inset-x-3 bottom-3 z-120 mx-auto max-w-2xl rounded-lg border border-border bg-background p-4 shadow-lg"
		>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<p className="text-xs leading-relaxed text-muted-foreground">
					Filosign uses optional product analytics to improve workflows. We do
					not sell personal data or use document contents for analytics. See our{" "}
					<a
						href={privacyUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="underline underline-offset-2 hover:text-foreground"
					>
						Privacy Policy
					</a>
					.
				</p>
				<div className="flex shrink-0 gap-2">
					<Button type="button" variant="outline" size="sm" onClick={onDecline}>
						Reject Non-Essential
					</Button>
					<Button type="button" variant="primary" size="sm" onClick={onAccept}>
						Accept All
					</Button>
				</div>
			</div>
		</div>
	);
}
