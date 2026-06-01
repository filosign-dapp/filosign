import type { PostHogExceptionProperties } from "@filosign/logger";
import type { AnalyticsProperties } from "@filosign/shared";

/** Flat exception metadata attached from oRPC / Hono (no nested objects). */
export type ServerExceptionProperties = Record<
	string,
	string | number | boolean
>;

export function toPostHogExceptionProperties(
	properties: AnalyticsProperties,
): PostHogExceptionProperties {
	const out: PostHogExceptionProperties = {};
	for (const [key, value] of Object.entries(properties)) {
		if (
			typeof value === "string" ||
			typeof value === "number" ||
			typeof value === "boolean" ||
			value === null ||
			value === undefined
		) {
			out[key] = value;
		}
	}
	return out;
}
