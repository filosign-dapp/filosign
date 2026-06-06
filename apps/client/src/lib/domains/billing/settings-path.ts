export const BILLING_SETTINGS_PATH = "/dashboard/settings/billing";

export function billingSettingsReturnUrl(origin: string): string {
	return `${origin.replace(/\/$/, "")}${BILLING_SETTINGS_PATH}`;
}
