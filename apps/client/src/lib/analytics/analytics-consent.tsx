import { useEffect, useState } from "react";
import { Button } from "@/src/lib/components/ui/button";

const ANALYTICS_CONSENT_KEY = "filosign.analytics.consent.v1";

type Consent = "accepted" | "declined" | null;

function readConsent(): Consent {
	if (typeof window === "undefined") return null;
	const value = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
	return value === "accepted" || value === "declined" ? value : null;
}

export function useAnalyticsConsent() {
	const [consent, setConsent] = useState<Consent>(() => readConsent());

	useEffect(() => {
		setConsent(readConsent());
	}, []);

	function saveConsent(next: Exclude<Consent, null>) {
		window.localStorage.setItem(ANALYTICS_CONSENT_KEY, next);
		setConsent(next);
	}

	return {
		analyticsAllowed: consent === "accepted",
		needsConsent: consent === null,
		acceptAnalytics: () => saveConsent("accepted"),
		declineAnalytics: () => saveConsent("declined"),
	};
}

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

	return (
		<div className="fixed inset-x-3 bottom-3 z-[120] mx-auto max-w-2xl rounded-lg border border-border bg-background p-4 shadow-lg">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<p className="text-xs leading-relaxed text-muted-foreground">
					Filosign uses optional product analytics to improve workflows. We do
					not sell personal data or use document contents for analytics.
				</p>
				<div className="flex shrink-0 gap-2">
					<Button type="button" variant="outline" size="sm" onClick={onDecline}>
						Decline
					</Button>
					<Button type="button" variant="primary" size="sm" onClick={onAccept}>
						Allow analytics
					</Button>
				</div>
			</div>
		</div>
	);
}
