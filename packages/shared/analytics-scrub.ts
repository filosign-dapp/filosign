/** Scalar values safe to attach to PostHog exception/event properties after scrubbing. */
export type AnalyticsPropertyValue =
	| string
	| number
	| boolean
	| null
	| undefined
	| AnalyticsPropertyValue[]
	| { [key: string]: AnalyticsPropertyValue };

export type AnalyticsProperties = Record<string, AnalyticsPropertyValue>;

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

function scrubAnalyticsValue(value: unknown): AnalyticsPropertyValue {
	if (typeof value === "string") return scrubAnalyticsString(value);
	if (Array.isArray(value)) {
		return value.map((item) => scrubAnalyticsValue(item));
	}
	if (typeof value === "object" && value !== null) {
		return scrubAnalyticsProperties(value as Record<string, unknown>);
	}
	if (
		typeof value === "number" ||
		typeof value === "boolean" ||
		value === null ||
		value === undefined
	) {
		return value;
	}
	return String(value);
}

export function scrubAnalyticsProperties(
	properties: Record<string, unknown>,
): AnalyticsProperties {
	const out: AnalyticsProperties = {};
	for (const [key, value] of Object.entries(properties)) {
		if (SENSITIVE_PROPERTY_KEYS.has(key)) {
			out[key] = "[redacted]";
			continue;
		}
		out[key] = scrubAnalyticsValue(value);
	}
	return out;
}

/** Event shape compatible with PostHog `BeforeSendFn` / `CaptureResult`. */
export type ScrubbableCaptureEvent = {
	properties?: AnalyticsProperties;
};

/** Scrub properties on a capture payload (PostHog `before_send` / server exception props). */
export function scrubCaptureEvent<T extends ScrubbableCaptureEvent>(
	event: T | null,
): T | null {
	if (!event?.properties) return event;
	return {
		...event,
		properties: scrubAnalyticsProperties(event.properties),
	};
}

/** @deprecated Use {@link scrubCaptureEvent} */
export const scrubPostHogBeforeSend = scrubCaptureEvent;
