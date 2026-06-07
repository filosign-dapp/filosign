/** Display name from an email local-part (e.g. jordan.lee → Jordan Lee). */
export function recipientDisplayNameFromEmail(email: string): string {
	const local = email.trim().split("@")[0] ?? "";
	const parts = local
		.split(/[._-]+/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());
	return parts.join(" ") || "there";
}
