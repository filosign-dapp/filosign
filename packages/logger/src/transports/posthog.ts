import { PostHog } from "posthog-node";

export type PostHogRuntime = {
	captureEvent(args: {
		distinctId: string;
		event: string;
		properties?: Record<string, unknown>;
		groups?: Record<string, string>;
	}): void;
	captureException(args: {
		error: unknown;
		distinctId?: string;
		properties?: Record<string, unknown>;
	}): void;
	shutdown(): Promise<void>;
	resetForTests(): void;
};

export function createPostHogRuntime(args: {
	enabled: boolean;
	apiKey?: string;
	host?: string;
	chain: string;
	service: string;
}): PostHogRuntime {
	let client: PostHog | null = null;

	function getClient(): PostHog | null {
		if (!args.enabled || !args.apiKey) {
			return null;
		}
		if (!client) {
			client = new PostHog(args.apiKey, {
				host: args.host ?? "https://us.i.posthog.com",
			});
		}
		return client;
	}

	return {
		captureEvent(eventArgs) {
			const ph = getClient();
			if (!ph) return;
			ph.capture({
				distinctId: eventArgs.distinctId.toLowerCase(),
				event: eventArgs.event,
				properties: {
					chain: args.chain,
					service: args.service,
					...eventArgs.properties,
				},
				...(eventArgs.groups && Object.keys(eventArgs.groups).length > 0
					? { groups: eventArgs.groups }
					: {}),
			});
		},
		captureException(exceptionArgs) {
			const ph = getClient();
			if (!ph) return;
			const distinctId =
				exceptionArgs.distinctId?.toLowerCase() ?? `service:${args.service}`;
			ph.captureException(exceptionArgs.error, distinctId, {
				chain: args.chain,
				service: args.service,
				...exceptionArgs.properties,
			});
		},
		async shutdown() {
			if (!client) return;
			await client.shutdown();
			client = null;
		},
		resetForTests() {
			client = null;
		},
	};
}
