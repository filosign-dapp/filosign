export function filosignProfileDisplayName(profile: {
	firstName: string | null;
	lastName: string | null;
}): string {
	return [profile.firstName, profile.lastName]
		.filter((part): part is string => typeof part === "string" && !!part.trim())
		.join(" ")
		.trim();
}

export function formatAttachedUsdcAmount(amountUsdc: string) {
	const n = Number(amountUsdc);
	if (Number.isNaN(n)) return amountUsdc;
	return n.toLocaleString(undefined, {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	});
}
