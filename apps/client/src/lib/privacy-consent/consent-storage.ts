export const ANALYTICS_CONSENT_STORAGE_KEY = "filosign.analytics.consent.v1";

export const ANALYTICS_CONSENT_CHANGED_EVENT =
	"filosign:analytics-consent-changed";

export type LocalAnalyticsConsent = "accepted" | "declined";

function safeLocalStorage(): Storage | null {
	try {
		return window.localStorage;
	} catch {
		return null;
	}
}

export function readStoredAnalyticsConsent(): LocalAnalyticsConsent | null {
	const storage = safeLocalStorage();
	if (!storage) return null;
	try {
		const value = storage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
		return value === "accepted" || value === "declined" ? value : null;
	} catch {
		return null;
	}
}

export function writeStoredAnalyticsConsent(next: LocalAnalyticsConsent): void {
	const storage = safeLocalStorage();
	if (!storage) return;
	try {
		storage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, next);
		window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_CHANGED_EVENT));
	} catch {
		// Storage blocked — consent UI still works for the session via React state.
	}
}

/** Best-effort cleanup when user withdraws analytics consent. */
export function clearPostHogClientStorage(): void {
	const storage = safeLocalStorage();
	if (!storage) return;
	try {
		for (const key of Object.keys(storage)) {
			if (key.startsWith("ph_")) {
				storage.removeItem(key);
			}
		}
	} catch {
		// noop
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
