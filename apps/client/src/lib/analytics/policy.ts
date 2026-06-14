/** Bump when privacy policy analytics section changes materially. */
export const ANALYTICS_PRIVACY_POLICY_VERSION = "privacy-2026-06";

export function analyticsPrivacyPolicyUrl(astroBaseUrl: string): string {
	return `${astroBaseUrl.replace(/\/$/, "")}/privacy`;
}
