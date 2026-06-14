import { beforeEach, describe, expect, mock, test } from "bun:test";
import { PLATFORM_ALERT_EVENTS } from "@/lib/platform/analytics";
import {
	capturedTelegramEvents,
	clearCapturedTelegramEvents,
	mockLoggerTelegramCapture,
} from "../support/alerts";
import { testEnvStub } from "../support/env-stub";

mockLoggerTelegramCapture();

describe("ROI platform alerts", () => {
	beforeEach(async () => {
		clearCapturedTelegramEvents();
		const { resetPlatformAlertsRuntimeForTests } = await import(
			"@/lib/platform/analytics"
		);
		resetPlatformAlertsRuntimeForTests();
	});

	test("emitWorkerStaleAlert emits error ping", async () => {
		mock.module("@/env", () => ({
			default: { ...testEnvStub, TG_ANALYTICS: true },
		}));
		const { emitWorkerStaleAlert } = await import("@/lib/platform/analytics");
		await emitWorkerStaleAlert({
			lastHeartbeatAt: null,
			staleForSec: 120,
		});
		expect(capturedTelegramEvents).toHaveLength(1);
		expect(capturedTelegramEvents[0]?.name).toBe(
			PLATFORM_ALERT_EVENTS.serverWorkerStale,
		);
		expect(capturedTelegramEvents[0]?.severity).toBe("error");
	});

	test("emitBillingWebhookStuckAlert emits aggregated context", async () => {
		mock.module("@/env", () => ({
			default: { ...testEnvStub, TG_ANALYTICS: true },
		}));
		const { emitBillingWebhookStuckAlert } = await import(
			"@/lib/platform/analytics"
		);
		await emitBillingWebhookStuckAlert({
			receivedCount: 2,
			failedCount: 1,
			oldestReceivedAgeMin: 20,
			reEnqueued: 1,
		});
		expect(capturedTelegramEvents[0]?.name).toBe(
			PLATFORM_ALERT_EVENTS.billingWebhookStuck,
		);
		expect(capturedTelegramEvents[0]?.context).toMatchObject({
			receivedCount: 2,
			failedCount: 1,
		});
	});

	test("emitEmailOutboxStuckAlert emits threshold summary", async () => {
		mock.module("@/env", () => ({
			default: { ...testEnvStub, TG_ANALYTICS: true },
		}));
		const { emitEmailOutboxStuckAlert } = await import(
			"@/lib/platform/analytics"
		);
		await emitEmailOutboxStuckAlert({ count: 3, oldestAgeMin: 45 });
		expect(capturedTelegramEvents[0]?.name).toBe(
			PLATFORM_ALERT_EVENTS.emailOutboxStuck,
		);
	});

	test("emitBillingSubscriptionProblemPing emits info ping", async () => {
		mock.module("@/env", () => ({
			default: { ...testEnvStub, TG_ANALYTICS: true },
		}));
		const { emitBillingSubscriptionProblemPing } = await import(
			"@/lib/platform/analytics"
		);
		await emitBillingSubscriptionProblemPing({
			eventType: "subscription.failed",
			organizationId: "org-1",
			subscriptionId: "sub-1",
			customerEmail: "user@example.com",
		});
		expect(capturedTelegramEvents[0]?.name).toBe(
			PLATFORM_ALERT_EVENTS.billingSubscriptionProblem,
		);
		expect(capturedTelegramEvents[0]?.severity).toBe("info");
	});

	test("emitEmailDisabledWarning emits one-shot info ping", async () => {
		mock.module("@/env", () => ({
			default: {
				...testEnvStub,
				TG_ANALYTICS: true,
				DEPLOYMENT: "production",
				RESEND_ENABLED: false,
				SES_ENABLED: false,
			},
		}));
		const { emitEmailDisabledWarning } = await import(
			"@/lib/platform/analytics"
		);
		await emitEmailDisabledWarning();
		expect(capturedTelegramEvents[0]?.name).toBe(
			PLATFORM_ALERT_EVENTS.serverEmailDisabled,
		);
	});
});

describe("worker liveness monitor", () => {
	test("shouldRunWorkerLivenessMonitor is false for local all-in-one", async () => {
		mock.module("@/env", () => ({
			default: {
				...testEnvStub,
				SERVER_ROLE: "all",
				DEPLOYMENT: "local",
				TG_ANALYTICS: true,
			},
		}));
		const {
			shouldRunWorkerLivenessMonitor,
			resetWorkerLivenessMonitorForTests,
		} = await import("@/lib/platform/worker/monitor");
		resetWorkerLivenessMonitorForTests();
		expect(shouldRunWorkerLivenessMonitor()).toBe(false);
	});

	test("shouldRunWorkerLivenessMonitor is true for api-only staging", async () => {
		mock.module("@/env", () => ({
			default: {
				...testEnvStub,
				SERVER_ROLE: "api",
				DEPLOYMENT: "staging",
				TG_ANALYTICS: true,
			},
		}));
		const { shouldRunWorkerLivenessMonitor } = await import(
			"@/lib/platform/worker/monitor"
		);
		expect(shouldRunWorkerLivenessMonitor()).toBe(true);
	});
});
