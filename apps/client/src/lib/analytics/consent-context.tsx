import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	ANALYTICS_CONSENT_CHANGED_EVENT,
	clearPostHogClientStorage,
	type LocalAnalyticsConsent,
	readStoredAnalyticsConsent,
	writeStoredAnalyticsConsent,
} from "./consent-storage";

type AnalyticsConsentContextValue = {
	analyticsAllowed: boolean;
	needsConsent: boolean;
	acceptAnalytics: () => void;
	declineAnalytics: () => void;
	withdrawAnalytics: () => void;
};

const AnalyticsConsentContext =
	createContext<AnalyticsConsentContextValue | null>(null);

function useAnalyticsConsentState(): AnalyticsConsentContextValue {
	const [consent, setConsent] = useState<LocalAnalyticsConsent | null>(() =>
		readStoredAnalyticsConsent(),
	);

	useEffect(() => {
		const syncFromStorage = () => {
			setConsent(readStoredAnalyticsConsent());
		};
		window.addEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, syncFromStorage);
		return () => {
			window.removeEventListener(
				ANALYTICS_CONSENT_CHANGED_EVENT,
				syncFromStorage,
			);
		};
	}, []);

	const acceptAnalytics = useCallback(() => {
		writeStoredAnalyticsConsent("accepted");
	}, []);

	const declineAnalytics = useCallback(() => {
		writeStoredAnalyticsConsent("declined");
		clearPostHogClientStorage();
	}, []);

	const withdrawAnalytics = useCallback(() => {
		writeStoredAnalyticsConsent("declined");
		clearPostHogClientStorage();
	}, []);

	return useMemo(
		() => ({
			analyticsAllowed: consent === "accepted",
			needsConsent: consent === null,
			acceptAnalytics,
			declineAnalytics,
			withdrawAnalytics,
		}),
		[acceptAnalytics, consent, declineAnalytics, withdrawAnalytics],
	);
}

export function AnalyticsConsentProvider({
	children,
}: {
	children: ReactNode;
}) {
	const value = useAnalyticsConsentState();
	return (
		<AnalyticsConsentContext.Provider value={value}>
			{children}
		</AnalyticsConsentContext.Provider>
	);
}

export function useAnalyticsConsent(): AnalyticsConsentContextValue {
	const value = useContext(AnalyticsConsentContext);
	if (!value) {
		throw new Error("useAnalyticsConsent requires AnalyticsConsentProvider");
	}
	return value;
}

/** Apply server receipt without triggering another server write. */
export function applyServerAnalyticsConsent(
	choice: "granted" | "denied" | "withdrawn",
): void {
	const local: LocalAnalyticsConsent =
		choice === "granted" ? "accepted" : "declined";
	const current = readStoredAnalyticsConsent();
	if (current === local) return;
	writeStoredAnalyticsConsent(local);
	if (local === "declined") {
		clearPostHogClientStorage();
	}
}
