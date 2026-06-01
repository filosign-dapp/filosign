import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

const captured: Record<string, unknown>[] = [];
const capturedExceptions: Record<string, unknown>[] = [];

mock.module("posthog-node", () => ({
	PostHog: class {
		capture(payload: Record<string, unknown>) {
			captured.push(payload);
		}
		captureException(
			error: unknown,
			distinctId?: string,
			properties?: Record<string, unknown>,
		) {
			capturedExceptions.push({ error, distinctId, properties });
		}
		async shutdown() {}
	},
}));

describe("createPostHogRuntime", () => {
	beforeEach(() => {
		captured.length = 0;
		capturedExceptions.length = 0;
	});

	afterEach(() => {
		// no env cleanup needed
	});

	test("does not capture when disabled", async () => {
		const { createPostHogRuntime } = await import(
			"../../src/transports/posthog"
		);
		const runtime = createPostHogRuntime({
			enabled: false,
			apiKey: "phc_test",
			host: "https://posthog.example.com",
			chain: "local",
			service: "filosign-server",
		});
		runtime.captureEvent({ distinctId: "0xAbC", event: "test_event" });
		expect(captured).toHaveLength(0);
	});

	test("captures with chain and service properties when enabled", async () => {
		const { createPostHogRuntime } = await import(
			"../../src/transports/posthog"
		);
		const runtime = createPostHogRuntime({
			enabled: true,
			apiKey: "phc_test",
			host: "https://posthog.example.com",
			chain: "testnet",
			service: "filosign-server",
		});
		runtime.captureEvent({
			distinctId: "0xAbC",
			event: "file_registered",
			properties: { piece_cid: "bafkreitest" },
			groups: { envelope: "bafkreitest" },
		});
		expect(captured).toHaveLength(1);
		expect(captured[0]?.distinctId).toBe("0xabc");
		expect(captured[0]?.properties).toMatchObject({
			chain: "testnet",
			service: "filosign-server",
			piece_cid: "bafkreitest",
		});
		expect(captured[0]?.groups).toEqual({ envelope: "bafkreitest" });
	});

	test("captureException when enabled", async () => {
		const { createPostHogRuntime } = await import(
			"../../src/transports/posthog"
		);
		const runtime = createPostHogRuntime({
			enabled: true,
			apiKey: "phc_test",
			host: "https://posthog.example.com",
			chain: "local",
			service: "filosign-server",
		});
		const err = new Error("boom");
		runtime.captureException({
			error: err,
			distinctId: "0xAbC",
			properties: { procedure: "files.list" },
		});
		expect(capturedExceptions).toHaveLength(1);
		expect(capturedExceptions[0]?.distinctId).toBe("0xabc");
		expect(capturedExceptions[0]?.error).toBe(err);
		expect(capturedExceptions[0]?.properties).toMatchObject({
			chain: "local",
			service: "filosign-server",
			procedure: "files.list",
		});
	});

	test("captureException no-ops when disabled", async () => {
		const { createPostHogRuntime } = await import(
			"../../src/transports/posthog"
		);
		const runtime = createPostHogRuntime({
			enabled: false,
			apiKey: "phc_test",
			host: "https://posthog.example.com",
			chain: "local",
			service: "filosign-server",
		});
		runtime.captureException({ error: new Error("x") });
		expect(capturedExceptions).toHaveLength(0);
	});

	test("resetForTests clears singleton client", async () => {
		const { createPostHogRuntime } = await import(
			"../../src/transports/posthog"
		);
		const runtime = createPostHogRuntime({
			enabled: true,
			apiKey: "phc_test",
			host: "https://posthog.example.com",
			chain: "local",
			service: "filosign-server",
		});
		runtime.captureEvent({ distinctId: "0x1", event: "a" });
		runtime.resetForTests();
		runtime.captureEvent({ distinctId: "0x2", event: "b" });
		expect(captured).toHaveLength(2);
	});
});
