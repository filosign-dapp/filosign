export const ANALYTICS_CONSENT_STORAGE_KEY = "filosign.analytics.consent.v1";

export const ANALYTICS_CONSENT_CHANGED_EVENT =
	"filosign:analytics-consent-changed";

export type LocalAnalyticsConsent = "accepted" | "declined";

export function readStoredAnalyticsConsent(): LocalAnalyticsConsent | null {
	if (typeof window === "undefined") return null;
	const value = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
	return value === "accepted" || value === "declined" ? value : null;
}

export function writeStoredAnalyticsConsent(next: LocalAnalyticsConsent): void {
	window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, next);
	window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_CHANGED_EVENT));
}

/** Best-effort cleanup when user withdraws analytics consent. */
export function clearPostHogClientStorage(): void {
	if (typeof window === "undefined") return;
	for (const key of Object.keys(window.localStorage)) {
		if (key.startsWith("ph_")) {
			window.localStorage.removeItem(key);
		}
	}
}

export function serverChoiceToLocal(
	choice: "granted" | "denied" | "withdrawn",
): LocalAnalyticsConsent {
	return choice === "granted" ? "accepted" : "declined";
}

export function localChoiceToServer(
	local: LocalAnalyticsConsent,
): "granted" | "denied" {
	return local === "accepted" ? "granted" : "denied";
}
