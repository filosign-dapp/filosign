import { ORPCError } from "@orpc/server";

function parseDeliveryTimestamp(value: string) {
	const numeric = Number(value);
	if (Number.isFinite(numeric) && numeric > 0) {
		return new Date(numeric * 1000);
	}
	const iso = new Date(value);
	if (!Number.isNaN(iso.getTime())) return iso;
	return null;
}

export function assertTimestampWithinTolerance(
	timestamp: string,
	toleranceMs = 300_000,
) {
	const parsed = parseDeliveryTimestamp(timestamp);
	if (!parsed) {
		throw new ORPCError("UNAUTHORIZED", {
			message: "Webhook timestamp is invalid",
		});
	}

	const deltaMs = Math.abs(Date.now() - parsed.getTime());
	if (deltaMs > toleranceMs) {
		throw new ORPCError("UNAUTHORIZED", {
			message: "Webhook timestamp is outside tolerance window",
		});
	}
}

export function parseOptionalDate(value: string | undefined): Date | null {
	if (!value) return null;
	const asNumber = Number(value);
	if (Number.isFinite(asNumber) && asNumber > 0)
		return new Date(asNumber * 1000);
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return null;
	return parsed;
}

export function parseWebhookTimestamp(value: string) {
	const parsed = parseDeliveryTimestamp(value);
	return parsed ?? new Date();
}
