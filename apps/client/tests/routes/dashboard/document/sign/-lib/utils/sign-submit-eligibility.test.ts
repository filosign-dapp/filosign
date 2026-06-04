import { describe, expect, test } from "bun:test";
import { canEnableSignSubmit } from "./sign-submit-eligibility";

const ready = {
	canSubmitPlacementSign: true,
	docReady: true,
	firstViewedAt: null as string | null,
	isSender: false,
	serverCanSign: true as boolean | undefined,
};

describe("canEnableSignSubmit", () => {
	test("sender may sign without firstViewedAt when fields are ready", () => {
		expect(
			canEnableSignSubmit({
				...ready,
				isSender: true,
				firstViewedAt: null,
			}),
		).toBe(true);
	});

	test("non-signer requires firstViewedAt", () => {
		expect(canEnableSignSubmit({ ...ready, firstViewedAt: null })).toBe(false);
		expect(
			canEnableSignSubmit({
				...ready,
				firstViewedAt: "2026-01-01T00:00:00.000Z",
			}),
		).toBe(true);
	});

	test("blocks when server denies canSign (e.g. sequential order)", () => {
		expect(
			canEnableSignSubmit({
				...ready,
				isSender: true,
				serverCanSign: false,
			}),
		).toBe(false);
	});
});
