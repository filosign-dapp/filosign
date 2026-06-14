import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { PLATFORM_ALERT_EVENTS } from "@/lib/platform/analytics";
import {
	capturedTelegramEvents,
	clearCapturedTelegramEvents,
	mockLoggerTelegramCapture,
} from "../support/alerts";
import { testEnvStub } from "../support/env-stub";

mockLoggerTelegramCapture();

describe("emitCriticalPlatformEventFromProcessEnv", () => {
	const priorTg = process.env.TG_ANALYTICS;
	const priorToken = process.env.TG_ANALYTICS_BOT_TOKEN;
	const priorGroup = process.env.TG_ANALYTICS_BOT_GROUP_ID;

	beforeEach(() => {
		clearCapturedTelegramEvents();
		process.env.TG_ANALYTICS = "true";
		process.env.TG_ANALYTICS_BOT_TOKEN = "bot";
		process.env.TG_ANALYTICS_BOT_GROUP_ID = "group";
	});

	afterEach(() => {
		if (priorTg === undefined) delete process.env.TG_ANALYTICS;
		else process.env.TG_ANALYTICS = priorTg;
		if (priorToken === undefined) delete process.env.TG_ANALYTICS_BOT_TOKEN;
		else process.env.TG_ANALYTICS_BOT_TOKEN = priorToken;
		if (priorGroup === undefined) delete process.env.TG_ANALYTICS_BOT_GROUP_ID;
		else process.env.TG_ANALYTICS_BOT_GROUP_ID = priorGroup;
	});

	test("uses process.env gate without loading @/env", async () => {
		const { emitCriticalPlatformEventFromProcessEnv } = await import(
			"@/lib/platform/analytics"
		);
		await emitCriticalPlatformEventFromProcessEnv({
			name: PLATFORM_ALERT_EVENTS.serverBootstrapFailed,
			severity: "critical",
			message: "Server bootstrap validation failed",
			context: { stage: "env_validation", error: "missing PG_URI" },
		});
		expect(capturedTelegramEvents).toHaveLength(1);
		expect(capturedTelegramEvents[0]?.name).toBe(
			PLATFORM_ALERT_EVENTS.serverBootstrapFailed,
		);
	});

	test("does not emit when TG_ANALYTICS is false", async () => {
		process.env.TG_ANALYTICS = "false";
		const { emitCriticalPlatformEventFromProcessEnv } = await import(
			"@/lib/platform/analytics"
		);
		await emitCriticalPlatformEventFromProcessEnv({
			name: PLATFORM_ALERT_EVENTS.serverBootstrapFailed,
			severity: "critical",
			message: "Server bootstrap validation failed",
			context: { stage: "env_validation", error: "missing PG_URI" },
		});
		expect(capturedTelegramEvents).toHaveLength(0);
	});
});

describe("createPlatformAlertsRuntime", () => {
	beforeEach(() => {
		clearCapturedTelegramEvents();
	});

	test("does not emit when Telegram alerts are disabled", async () => {
		const { createPlatformAlertsRuntime } = await import(
			"@/lib/platform/analytics"
		);
		const runtime = createPlatformAlertsRuntime({
			enabled: false,
			botToken: "bot",
			chatId: "group",
		});
		await runtime.emit({
			name: PLATFORM_ALERT_EVENTS.serverHttp500,
			severity: "critical",
			message: "HTTP request returned 5xx",
			context: { method: "GET", path: "/", status: 500, durationMs: 1 },
		});
		expect(capturedTelegramEvents).toHaveLength(0);
	});

	test("emits when enabled and dedupes identical events", async () => {
		const { createPlatformAlertsRuntime } = await import(
			"@/lib/platform/analytics"
		);
		const runtime = createPlatformAlertsRuntime({
			enabled: true,
			botToken: "bot",
			chatId: "group",
		});
		const event = {
			name: PLATFORM_ALERT_EVENTS.serverHttp500,
			severity: "critical" as const,
			message: "HTTP request returned 5xx",
			context: { method: "GET", path: "/", status: 500, durationMs: 1 },
		};
		await runtime.emit(event);
		await runtime.emit(event);
		expect(capturedTelegramEvents).toHaveLength(1);
	});
});

describe("emitServerStartedPing", () => {
	beforeEach(async () => {
		clearCapturedTelegramEvents();
		const { resetPlatformAlertsRuntimeForTests } = await import(
			"@/lib/platform/analytics"
		);
		resetPlatformAlertsRuntimeForTests();
	});

	test("emits info ping when TG_ANALYTICS is enabled", async () => {
		mock.module("@/env", () => ({
			default: { ...testEnvStub, TG_ANALYTICS: true },
		}));
		const { emitServerStartedPing } = await import("@/lib/platform/analytics");
		await emitServerStartedPing();
		expect(capturedTelegramEvents).toHaveLength(1);
		expect(capturedTelegramEvents[0]?.name).toBe(
			PLATFORM_ALERT_EVENTS.serverStarted,
		);
		expect(capturedTelegramEvents[0]?.severity).toBe("info");
		expect(capturedTelegramEvents[0]?.message).toBe("Filosign server started");
	});

	test("does not emit when TG_ANALYTICS is disabled", async () => {
		mock.module("@/env", () => ({
			default: { ...testEnvStub, TG_ANALYTICS: false },
		}));
		const { emitServerStartedPing } = await import("@/lib/platform/analytics");
		await emitServerStartedPing();
		expect(capturedTelegramEvents).toHaveLength(0);
	});
});

describe("emitProductFeedbackPing", () => {
	beforeEach(async () => {
		clearCapturedTelegramEvents();
		const { resetPlatformAlertsRuntimeForTests } = await import(
			"@/lib/platform/analytics"
		);
		resetPlatformAlertsRuntimeForTests();
	});

	test("emits info ping when TG_ANALYTICS is enabled", async () => {
		mock.module("@/env", () => ({
			default: { ...testEnvStub, TG_ANALYTICS: true },
		}));
		const { emitProductFeedbackPing } = await import(
			"@/lib/platform/analytics"
		);
		await emitProductFeedbackPing({
			walletAddress: "0x1111111111111111111111111111111111111111",
			organizationId: null,
			kind: "feedback",
			featureArea: "send",
			promptType: "contextual",
			message: "Smooth send flow",
			route: "/dashboard/envelope/create/add-sign",
			trigger: "first_envelope_sent",
			pieceCid: null,
		});
		expect(capturedTelegramEvents).toHaveLength(1);
		expect(capturedTelegramEvents[0]?.name).toBe(
			PLATFORM_ALERT_EVENTS.productFeedbackSubmitted,
		);
		expect(capturedTelegramEvents[0]?.severity).toBe("info");
		expect(capturedTelegramEvents[0]?.message).toBe("New user feedback");
		expect(capturedTelegramEvents[0]?.context).toMatchObject({
			wallet: "0x1111111111111111111111111111111111111111",
			kind: "feedback",
			featureArea: "send",
			message: "Smooth send flow",
		});
	});

	test("emits bug report ping with kind in context", async () => {
		mock.module("@/env", () => ({
			default: { ...testEnvStub, TG_ANALYTICS: true },
		}));
		const { emitProductFeedbackPing } = await import(
			"@/lib/platform/analytics"
		);
		await emitProductFeedbackPing({
			walletAddress: "0x1111111111111111111111111111111111111111",
			organizationId: null,
			kind: "bug",
			featureArea: "sign",
			promptType: "global",
			message: "Upload button does nothing",
			route: "/dashboard/document/sign",
			trigger: null,
			pieceCid: null,
		});
		expect(capturedTelegramEvents).toHaveLength(1);
		expect(capturedTelegramEvents[0]?.message).toBe("New bug report");
		expect(capturedTelegramEvents[0]?.context).toMatchObject({
			kind: "bug",
			message: "Upload button does nothing",
		});
	});

	test("emits support request ping with kind in context", async () => {
		mock.module("@/env", () => ({
			default: { ...testEnvStub, TG_ANALYTICS: true },
		}));
		const { emitProductFeedbackPing } = await import(
			"@/lib/platform/analytics"
		);
		await emitProductFeedbackPing({
			walletAddress: "0x1111111111111111111111111111111111111111",
			organizationId: "00000000-0000-4000-8000-000000000001",
			kind: "support",
			featureArea: "workspace",
			promptType: "global",
			message: "Need help inviting a teammate",
			route: "/dashboard/settings/workspace",
			trigger: null,
			pieceCid: null,
		});
		expect(capturedTelegramEvents).toHaveLength(1);
		expect(capturedTelegramEvents[0]?.message).toBe("New support request");
		expect(capturedTelegramEvents[0]?.context).toMatchObject({
			kind: "support",
			organizationId: "00000000-0000-4000-8000-000000000001",
			message: "Need help inviting a teammate",
		});
	});

	test("does not emit when TG_ANALYTICS is disabled", async () => {
		mock.module("@/env", () => ({
			default: { ...testEnvStub, TG_ANALYTICS: false },
		}));
		const { emitProductFeedbackPing } = await import(
			"@/lib/platform/analytics"
		);
		await emitProductFeedbackPing({
			walletAddress: "0x1111111111111111111111111111111111111111",
			organizationId: null,
			kind: "feedback",
			featureArea: "send",
			promptType: "global",
			message: "Needs work",
			route: null,
			trigger: null,
			pieceCid: null,
		});
		expect(capturedTelegramEvents).toHaveLength(0);
	});
});
