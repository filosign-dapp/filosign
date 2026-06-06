import { normalizePlacementRecipientEmail } from "@filosign/shared";

export function isValidRecipientEmail(email: string) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Normalized lookup key when email syntax is valid; otherwise undefined. */
export function recipientLookupEmail(email: string): string | undefined {
	const trimmed = email.trim();
	if (!trimmed || !isValidRecipientEmail(trimmed)) return undefined;
	return normalizePlacementRecipientEmail(trimmed);
}
