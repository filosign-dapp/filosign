import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

const captured: Record<string, unknown>[] = [];

mock.module("posthog-node", () => ({
	PostHog: class {
		capture(payload: Record<string, unknown>) {
			captured.push(payload);
		}
		async shutdown() {}
	},
}));

describe("createPostHogRuntime", () => {
	beforeEach(() => {
		captured.length = 0;
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

	test("resetForTests clears singleton client", async () => {
		const { createPostHogRuntime } = await import(
			"../../src/transports/posthog"
		);
		const runtime = createPostHogRuntime({
			enabled: true,
			apiKey: "phc_test",
			chain: "local",
			service: "filosign-server",
		});
		runtime.captureEvent({ distinctId: "0x1", event: "a" });
		runtime.resetForTests();
		runtime.captureEvent({ distinctId: "0x2", event: "b" });
		expect(captured).toHaveLength(2);
	});
});
