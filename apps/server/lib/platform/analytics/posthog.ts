import { createPostHogRuntime } from "@filosign/logger";
import {
	type AnalyticsProperties,
	scrubAnalyticsProperties,
} from "@filosign/shared";
import {
	type ServerExceptionProperties,
	toPostHogExceptionProperties,
} from "@/lib/platform/analytics/exception-properties";

/** Read PostHog config from process.env to keep tests isolated from full env loader. */
function readPostHogConfig() {
	const enabled = process.env.POSTHOG_ENABLED === "true";
	const apiKey = process.env.POSTHOG_API_KEY;
	const host = process.env.POSTHOG_HOST?.trim();
	if (!host) {
		throw new Error("POSTHOG_HOST is required");
	}
	return { enabled, apiKey, host };
}

function readAnalyticsChain(): string {
	return process.env.CHAIN?.trim() || "local";
}

export function readAnalyticsDeployment(): string {
	return process.env.DEPLOYMENT?.trim() || "local";
}

let runtime: ReturnType<typeof createPostHogRuntime> | null = null;

export function getPostHogRuntime() {
	if (runtime) return runtime;
	const config = readPostHogConfig();
	runtime = createPostHogRuntime({
		enabled: config.enabled,
		apiKey: config.apiKey,
		host: config.host,
		chain: readAnalyticsChain(),
		service: "filosign-server",
	});
	return runtime;
}

function baseEventProperties(): Record<string, string> {
	return {
		chain: readAnalyticsChain(),
		deployment: readAnalyticsDeployment(),
	};
}

const SERVICE_DISTINCT_ID = "service:filosign-server";

export function captureEvent(args: {
	distinctId: string;
	event: string;
	properties?: Record<string, unknown>;
	groups?: Record<string, string>;
}): void {
	getPostHogRuntime().captureEvent({
		...args,
		properties: {
			...baseEventProperties(),
			...args.properties,
		},
	});
}

export function captureServerException(
	error: unknown,
	properties?: ServerExceptionProperties,
): void {
	const scrubbed = properties
		? toPostHogExceptionProperties(
				scrubAnalyticsProperties(properties satisfies AnalyticsProperties),
			)
		: undefined;
	getPostHogRuntime().captureException({
		error,
		distinctId: SERVICE_DISTINCT_ID,
		properties: {
			...baseEventProperties(),
			...scrubbed,
		},
	});
}

export async function shutdownPostHog(): Promise<void> {
	if (!runtime) return;
	await runtime.shutdown();
	runtime = null;
}

/** Test-only: clear singleton so mocks can take effect. */
export function resetPostHogClientForTests(): void {
	runtime?.resetForTests();
	runtime = null;
}
