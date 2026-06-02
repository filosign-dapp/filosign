import { beforeEach, describe, expect, mock, test } from "bun:test";
import { EventEmitter } from "node:events";
import type { Job, Worker } from "bullmq";
import { PLATFORM_ALERT_EVENTS } from "@/lib/platform/analytics/events";
import {
	capturedTelegramEvents,
	clearCapturedTelegramEvents,
	flushPlatformAlerts,
	mockLoggerTelegramCapture,
} from "../support/platform-alerts";

mockLoggerTelegramCapture();

mock.module("@/env", () => ({
	default: {
		TG_ANALYTICS: true,
		TG_ANALYTICS_BOT_TOKEN: "test-token",
		TG_ANALYTICS_BOT_GROUP_ID: "test-chat",
		BULLMQ_PREFIX: "{filosign}",
	},
}));

describe("attachWorkerFailedHandler", () => {
	beforeEach(async () => {
		clearCapturedTelegramEvents();
		const { resetPlatformAlertsRuntimeForTests } = await import(
			"@/lib/platform/analytics/platform-alerts"
		);
		resetPlatformAlertsRuntimeForTests();
	});

	test("Telegram alert only after final attempt", async () => {
		const { attachWorkerFailedHandler } = await import(
			"@/lib/platform/jobs/utils/queue-config"
		);
		const worker = new EventEmitter() as Worker;
		attachWorkerFailedHandler(worker, "email");

		const job = {
			id: "idem-1",
			attemptsMade: 4,
			opts: { attempts: 5 },
		} as Job;

		worker.emit("failed", job, new Error("transient"), "email");
		await flushPlatformAlerts();
		expect(capturedTelegramEvents).toHaveLength(0);

		const exhausted = { ...job, attemptsMade: 5 } as Job;
		worker.emit("failed", exhausted, new Error("final"), "email");
		await flushPlatformAlerts();

		expect(capturedTelegramEvents).toHaveLength(1);
		expect(capturedTelegramEvents[0]?.name).toBe(
			PLATFORM_ALERT_EVENTS.serverBullmqJobFailed,
		);
	});
});
