import { envelopeAnalyticsContext } from "./envelope";
import type { ServerAnalyticsEvent } from "./events";
import { captureEvent } from "./posthog";

export function trackServerEvent(args: {
	distinctId: string;
	event: ServerAnalyticsEvent | string;
	pieceCid?: string;
	properties?: Record<string, unknown>;
}): void {
	const envelope = args.pieceCid?.trim()
		? envelopeAnalyticsContext(args.pieceCid)
		: undefined;

	captureEvent({
		distinctId: args.distinctId,
		event: args.event,
		properties: {
			...args.properties,
			...envelope?.properties,
		},
		groups: envelope?.groups,
	});
}
