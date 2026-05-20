import { PostHog } from "posthog-node";
import { readAnalyticsChain, readPostHogConfig } from "./posthog-config";

let client: PostHog | null = null;

function getClient(): PostHog | null {
	const { enabled, apiKey, host } = readPostHogConfig();
	if (!enabled || !apiKey) {
		return null;
	}
	if (!client) {
		client = new PostHog(apiKey, { host });
	}
	return client;
}

export function captureEvent(args: {
	distinctId: string;
	event: string;
	properties?: Record<string, unknown>;
	groups?: Record<string, string>;
}): void {
	const ph = getClient();
	if (!ph) return;
	ph.capture({
		distinctId: args.distinctId.toLowerCase(),
		event: args.event,
		properties: {
			chain: readAnalyticsChain(),
			service: "filosign-server",
			...args.properties,
		},
		...(args.groups && Object.keys(args.groups).length > 0
			? { groups: args.groups }
			: {}),
	});
}

export async function shutdownPostHog(): Promise<void> {
	if (client) {
		await client.shutdown();
		client = null;
	}
}

/** Test-only: clear singleton so mocks can take effect. */
export function resetPostHogClientForTests(): void {
	client = null;
}
