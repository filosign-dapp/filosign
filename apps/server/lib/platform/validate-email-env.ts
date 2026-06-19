type EmailEnvSlice = {
	EMAIL_PROVIDER: "ses" | "resend";
	RESEND_ENABLED: boolean;
	RESEND_API_KEY?: string;
	RESEND_FROM_EMAIL?: string;
	SES_ENABLED: boolean;
	SES_REGION?: string;
	SES_FROM_EMAIL?: string;
};

function resendConfigured(env: EmailEnvSlice): boolean {
	return (
		Boolean(env.RESEND_API_KEY?.trim()) &&
		Boolean(env.RESEND_FROM_EMAIL?.trim())
	);
}

function sesConfigured(env: EmailEnvSlice): boolean {
	return Boolean(env.SES_REGION?.trim()) && Boolean(env.SES_FROM_EMAIL?.trim());
}

export function validateEmailEnv(env: EmailEnvSlice): void {
	if (!env.SES_ENABLED && !env.RESEND_ENABLED) {
		return;
	}

	if (env.EMAIL_PROVIDER === "ses") {
		if (!env.SES_ENABLED || !sesConfigured(env)) {
			throw new Error(
				"EMAIL_PROVIDER=ses requires SES_ENABLED=true with SES_REGION and SES_FROM_EMAIL",
			);
		}
		if (env.RESEND_ENABLED && !resendConfigured(env)) {
			throw new Error(
				"RESEND_ENABLED=true requires RESEND_API_KEY and RESEND_FROM_EMAIL for fallback",
			);
		}
		return;
	}

	if (!env.RESEND_ENABLED || !resendConfigured(env)) {
		throw new Error(
			"EMAIL_PROVIDER=resend requires RESEND_ENABLED=true with RESEND_API_KEY and RESEND_FROM_EMAIL",
		);
	}
	if (env.SES_ENABLED && !sesConfigured(env)) {
		throw new Error(
			"SES_ENABLED=true requires SES_REGION and SES_FROM_EMAIL for fallback",
		);
	}
}
