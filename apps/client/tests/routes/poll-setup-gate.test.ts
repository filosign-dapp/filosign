import { describe, expect, test } from "bun:test";
import {
	isAwaitingPaidSetupWebhook,
	previewGateWithSetupPolling,
	SETUP_GATE_POLL_ATTEMPTS,
} from "@/src/routes/-lib/utils/poll-setup-gate";

describe("previewGateWithSetupPolling", () => {
	test("returns immediately when no setup token", async () => {
		let calls = 0;
		const result = await previewGateWithSetupPolling(
			async () => {
				calls++;
				return { valid: true };
			},
			{ email: "a@b.com" },
		);
		expect(result.valid).toBe(true);
		expect(calls).toBe(1);
	});

	test("polls with exponential backoff until setup is ready", async () => {
		let calls = 0;
		const started = Date.now();
		const result = await previewGateWithSetupPolling(
			async () => {
				calls++;
				if (calls < 3) {
					return {
						valid: false,
						reason: "Setup link not found or expired",
					};
				}
				return { valid: true };
			},
			{ setup: "setup-token-abc12345" },
			{ attempts: 5, baseDelayMs: 5 },
		);
		const elapsed = Date.now() - started;

		expect(result.valid).toBe(true);
		expect(calls).toBe(3);
		expect(elapsed).toBeGreaterThanOrEqual(5 + 10 - 5);
	});

	test("stops after max attempts and returns last error", async () => {
		let calls = 0;
		const result = await previewGateWithSetupPolling(
			async () => {
				calls++;
				return {
					valid: false,
					reason: "Setup link not found or expired",
				};
			},
			{ setup: "setup-token-abc12345" },
			{ attempts: SETUP_GATE_POLL_ATTEMPTS, baseDelayMs: 1 },
		);

		expect(result.valid).toBe(false);
		expect(calls).toBe(SETUP_GATE_POLL_ATTEMPTS);
		if (!result.valid) {
			expect(result.reason).toBe("Setup link not found or expired");
		}
	});

	test("does not retry invalid setup token", async () => {
		let calls = 0;
		const result = await previewGateWithSetupPolling(
			async () => {
				calls++;
				return { valid: false, reason: "Invalid setup link" };
			},
			{ setup: "short" },
		);

		expect(calls).toBe(1);
		expect(result.valid).toBe(false);
	});
});

describe("isAwaitingPaidSetupWebhook", () => {
	test("matches pending webhook reason only", () => {
		expect(
			isAwaitingPaidSetupWebhook({
				valid: false,
				reason: "Setup link not found or expired",
			}),
		).toBe(true);
		expect(
			isAwaitingPaidSetupWebhook({
				valid: false,
				reason: "Invalid setup link",
			}),
		).toBe(false);
	});
});
