import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	PLATFORM_ALERT_EVENTS,
	PLATFORM_ALERT_POSTHOG_EVENT,
} from "@/lib/platform/analytics";
import {
	clearPosthogCaptures,
	posthogCaptures,
} from "../support/posthog-capture";

const priorEnabled = process.env.POSTHOG_ENABLED;
const priorKey = process.env.POSTHOG_API_KEY;
const priorHost = process.env.POSTHOG_HOST;

beforeEach(async () => {
	clearPosthogCaptures();
	process.env.POSTHOG_ENABLED = "true";
	process.env.POSTHOG_API_KEY = "phc_test";
	process.env.POSTHOG_HOST = "https://posthog.example.com";
	const { resetPostHogClientForTests } = await import(
		"@/lib/platform/analytics"
	);
	resetPostHogClientForTests();
	const { resetPlatformAlertPostHogDedupeForTests } = await import(
		"@/lib/platform/analytics"
	);
	resetPlatformAlertPostHogDedupeForTests();
});

afterEach(async () => {
	const { resetPostHogClientForTests } = await import(
		"@/lib/platform/analytics"
	);
	resetPostHogClientForTests();
	if (priorEnabled === undefined) delete process.env.POSTHOG_ENABLED;
	else process.env.POSTHOG_ENABLED = priorEnabled;
	if (priorKey === undefined) delete process.env.POSTHOG_API_KEY;
	else process.env.POSTHOG_API_KEY = priorKey;
	if (priorHost === undefined) delete process.env.POSTHOG_HOST;
	else process.env.POSTHOG_HOST = priorHost;
});

describe("platformAlertPostHogProperties", () => {
	test("flattens and scrubs alert context", async () => {
		const { platformAlertPostHogProperties } = await import(
			"@/lib/platform/analytics"
		);
		const props = platformAlertPostHogProperties({
			name: PLATFORM_ALERT_EVENTS.serverDbInfraError,
			severity: "critical",
			message: "DB pool error",
			context: {
				source: "pg_pool",
				error: "connection refused",
			},
		});
		expect(props).toMatchObject({
			alert_name: PLATFORM_ALERT_EVENTS.serverDbInfraError,
			severity: "critical",
			message: "DB pool error",
			source: "pg_pool",
			error: "connection refused",
		});
	});
});

describe("emitCriticalPlatformEvent PostHog mirror", () => {
	test("mirrors platform_alert when PostHog enabled", async () => {
		const { emitCriticalPlatformEvent, resetPlatformAlertsRuntimeForTests } =
			await import("@/lib/platform/analytics");
		resetPlatformAlertsRuntimeForTests();
		await emitCriticalPlatformEvent({
			name: PLATFORM_ALERT_EVENTS.serverHttp500,
			severity: "critical",
			message: "HTTP request returned 5xx",
			context: { method: "GET", path: "/api/rpc", status: 500, durationMs: 42 },
		});
		expect(posthogCaptures).toHaveLength(1);
		expect(posthogCaptures[0]?.event).toBe(PLATFORM_ALERT_POSTHOG_EVENT);
		expect(posthogCaptures[0]?.properties).toMatchObject({
			alert_name: PLATFORM_ALERT_EVENTS.serverHttp500,
			method: "GET",
			path: "/api/rpc",
			status: 500,
			durationMs: 42,
			chain: "local",
			deployment: "local",
		});
	});

	test("dedupes identical alerts within window", async () => {
		const { emitCriticalPlatformEvent, resetPlatformAlertsRuntimeForTests } =
			await import("@/lib/platform/analytics");
		resetPlatformAlertsRuntimeForTests();
		const event = {
			name: PLATFORM_ALERT_EVENTS.serverCronJobFailed,
			severity: "critical" as const,
			message: "Cron failed",
			context: { job: "sync-settlement-rules", error: "timeout" },
		};
		await emitCriticalPlatformEvent(event);
		await emitCriticalPlatformEvent(event);
		expect(posthogCaptures).toHaveLength(1);
	});

	test("does not mirror when PostHog disabled", async () => {
		const {
			mirrorPlatformAlertToPostHog,
			resetPlatformAlertPostHogDedupeForTests,
		} = await import("@/lib/platform/analytics");
		resetPlatformAlertPostHogDedupeForTests();
		mirrorPlatformAlertToPostHog(
			{
				name: PLATFORM_ALERT_EVENTS.serverBootstrapFailed,
				severity: "critical",
				message: "Bootstrap failed",
				context: { stage: "env", error: "x" },
			},
			false,
		);
		expect(posthogCaptures).toHaveLength(0);
	});
});

describe("emitCriticalPlatformEventFromProcessEnv PostHog mirror", () => {
	test("mirrors when PostHog env is set in process.env", async () => {
		const { emitCriticalPlatformEventFromProcessEnv } = await import(
			"@/lib/platform/analytics"
		);
		process.env.TG_ANALYTICS = "false";
		await emitCriticalPlatformEventFromProcessEnv({
			name: PLATFORM_ALERT_EVENTS.serverBootstrapFailed,
			severity: "critical",
			message: "Server bootstrap validation failed",
			context: { stage: "env_validation", error: "missing PG_URI" },
		});
		expect(posthogCaptures).toHaveLength(1);
		expect(posthogCaptures[0]?.event).toBe(PLATFORM_ALERT_POSTHOG_EVENT);
	});
});
