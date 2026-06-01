import env from "@/env";

export function isSesDeliveryConfigured(): boolean {
	if (!env.SES_ENABLED) return false;
	if (!env.SES_REGION?.trim()) return false;
	if (!env.SES_FROM_EMAIL?.trim()) return false;
	return true;
}

export function warnIfSesMisconfigured(): void {
	if (!env.SES_ENABLED) return;
	const missing: string[] = [];
	if (!env.SES_REGION?.trim()) missing.push("SES_REGION");
	if (!env.SES_FROM_EMAIL?.trim()) missing.push("SES_FROM_EMAIL");
	if (missing.length === 0) return;
	console.warn(
		`[email] SES_ENABLED=true but missing ${missing.join(", ")}; SES fallback is disabled until configured.`,
	);
}
