import { useFilosignContext } from "@filosign/react";
import { useIsLoggedIn } from "@filosign/react/auth";
import { useCallback, useEffect, useRef } from "react";
import { safeAsync } from "@/src/lib/utils/safe";
import { AnalyticsConsentBanner } from "./analytics-consent-banner";
import {
	applyServerAnalyticsConsent,
	useAnalyticsConsent,
} from "./consent-context";
import {
	localChoiceToServer,
	readStoredAnalyticsConsent,
	serverChoiceToLocal,
} from "./consent-storage";
import { recordAnalyticsConsentOnServer } from "./record-consent";

export function AnalyticsConsentCoordinator({
	consentRequired,
	posthogEnabled,
}: {
	consentRequired: boolean;
	posthogEnabled: boolean;
}) {
	const { rpc, rpcQuery } = useFilosignContext();
	const isLoggedIn = useIsLoggedIn();
	const { needsConsent, acceptAnalytics, declineAnalytics } =
		useAnalyticsConsent();
	const syncedRef = useRef(false);

	useEffect(() => {
		syncedRef.current = false;
	}, [isLoggedIn.data]);

	useEffect(() => {
		if (!consentRequired || !posthogEnabled || !isLoggedIn.data) return;
		if (syncedRef.current) return;

		let cancelled = false;
		void (async () => {
			const [state, err] = await safeAsync(() =>
				rpcQuery.users.privacyState.call(),
			);
			if (cancelled || err || !state) return;
			syncedRef.current = true;

			const server = state?.latestAnalyticsConsent ?? null;
			const local = readStoredAnalyticsConsent();

			if (server) {
				const localFromServer = serverChoiceToLocal(server.choice);
				if (local !== localFromServer) {
					applyServerAnalyticsConsent(server.choice);
				}
				return;
			}

			if (local) {
				await safeAsync(() =>
					recordAnalyticsConsentOnServer(rpc, localChoiceToServer(local)),
				);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [consentRequired, isLoggedIn.data, posthogEnabled, rpc, rpcQuery]);

	const persistChoice = useCallback(
		async (choice: "granted" | "denied") => {
			if (!isLoggedIn.data) return;
			await safeAsync(() => recordAnalyticsConsentOnServer(rpc, choice));
		},
		[isLoggedIn.data, rpc],
	);

	const handleAccept = useCallback(() => {
		acceptAnalytics();
		void persistChoice("granted");
	}, [acceptAnalytics, persistChoice]);

	const handleDecline = useCallback(() => {
		declineAnalytics();
		void persistChoice("denied");
	}, [declineAnalytics, persistChoice]);

	if (!consentRequired || !posthogEnabled) return null;

	return (
		<AnalyticsConsentBanner
			needsConsent={needsConsent}
			onAccept={handleAccept}
			onDecline={handleDecline}
		/>
	);
}
