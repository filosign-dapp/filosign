import { createPostHogRuntime } from "@filosign/logger";

/** Read PostHog config from process.env to keep tests isolated from full env loader. */
function readPostHogConfig() {
	const enabled = process.env.POSTHOG_ENABLED === "true";
	const apiKey = process.env.POSTHOG_API_KEY;
	const host = process.env.POSTHOG_HOST?.trim() || "https://us.i.posthog.com";
	return { enabled, apiKey, host };
}

function readAnalyticsChain(): string {
	return process.env.CHAIN?.trim() || "local";
}

let runtime: ReturnType<typeof createPostHogRuntime> | null = null;

function getRuntime() {
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

export function captureEvent(args: {
	distinctId: string;
	event: string;
	properties?: Record<string, unknown>;
	groups?: Record<string, string>;
}): void {
	getRuntime().captureEvent(args);
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
