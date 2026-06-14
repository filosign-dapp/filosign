import type { AppRouterClient } from "@filosign/react/orpc";
import { ANALYTICS_PRIVACY_POLICY_VERSION } from "./policy";

export type AnalyticsConsentServerChoice = "granted" | "denied" | "withdrawn";

export async function recordAnalyticsConsentOnServer(
	rpc: AppRouterClient,
	choice: AnalyticsConsentServerChoice,
): Promise<void> {
	await rpc.users.setAnalyticsConsent({
		choice,
		policyVersion: ANALYTICS_PRIVACY_POLICY_VERSION,
	});
}
