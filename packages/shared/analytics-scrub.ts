const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const HEX_64_RE = /^0x[0-9a-fA-F]{64}$/;

const SENSITIVE_PROPERTY_KEYS = new Set([
	"ciphertext",
	"encryptionPublicKey",
	"mnemonic",
	"passphrase",
	"privateKey",
	"secret",
	"dek",
	"kemCiphertext",
	"senderEncryptedEncryptionKey",
	"orgEncryptedEncryptionKey",
]);

export function scrubAnalyticsString(value: string): string {
	const trimmed = value.trim();
	if (EMAIL_RE.test(trimmed)) return "[email redacted]";
	if (HEX_64_RE.test(trimmed)) return "[hex redacted]";
	if (trimmed.length > 200 && /^[A-Za-z0-9+/=_-]+$/.test(trimmed)) {
		return "[blob redacted]";
	}
	return value;
}

export function scrubAnalyticsProperties(
	properties: Record<string, unknown>,
): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(properties)) {
		if (SENSITIVE_PROPERTY_KEYS.has(key)) {
			out[key] = "[redacted]";
			continue;
		}
		out[key] = scrubAnalyticsValue(value);
	}
	return out;
}

function scrubAnalyticsValue(value: unknown): unknown {
	if (typeof value === "string") return scrubAnalyticsString(value);
	if (Array.isArray(value)) {
		return value.map((item) => scrubAnalyticsValue(item));
	}
	if (value && typeof value === "object") {
		return scrubAnalyticsProperties(value as Record<string, unknown>);
	}
	return value;
}

/** PostHog `before_send` hook — returns null to drop, or scrubbed event. */
export function scrubPostHogBeforeSend<
	T extends { properties?: Record<string, unknown> },
>(event: T | null): T | null {
	if (!event?.properties) return event;
	return {
		...event,
		properties: scrubAnalyticsProperties(event.properties),
	};
}
