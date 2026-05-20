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

const priorEnabled = process.env.POSTHOG_ENABLED;
const priorKey = process.env.POSTHOG_API_KEY;

beforeEach(async () => {
	captured.length = 0;
	process.env.POSTHOG_ENABLED = "true";
	process.env.POSTHOG_API_KEY = "phc_test";
	const { resetPostHogClientForTests } = await import("./posthog");
	resetPostHogClientForTests();
});

afterEach(() => {
	if (priorEnabled === undefined) {
		delete process.env.POSTHOG_ENABLED;
	} else {
		process.env.POSTHOG_ENABLED = priorEnabled;
	}
	if (priorKey === undefined) {
		delete process.env.POSTHOG_API_KEY;
	} else {
		process.env.POSTHOG_API_KEY = priorKey;
	}
});

describe("captureEvent with PostHog enabled", () => {
	test("forwards envelope group on capture", async () => {
		const { captureEvent } = await import("./posthog");
		const pieceCid =
			"bafkzcibey2damdvpptrsdqvstcplmzrlquc5r2fm5azoknjeoifwbottyhyyywnjgm";
		captureEvent({
			distinctId: "0xAbC",
			event: "file_registered",
			properties: { piece_cid: pieceCid },
			groups: { envelope: pieceCid },
		});
		expect(captured).toHaveLength(1);
		expect(captured[0]?.groups).toEqual({ envelope: pieceCid });
		expect(captured[0]?.distinctId).toBe("0xabc");
	});
});

describe("trackServerEvent with PostHog enabled", () => {
	test("merges pieceCid into properties and groups", async () => {
		const { trackServerEvent } = await import("./track");
		const pieceCid = "bafkreitestcid";
		trackServerEvent({
			distinctId: "0x0000000000000000000000000000000000000001",
			event: "cold_invite_claimed",
			pieceCid,
			properties: { is_signer: true },
		});
		expect(captured).toHaveLength(1);
		expect(captured[0]?.properties).toMatchObject({
			piece_cid: pieceCid,
			is_signer: true,
			service: "filosign-server",
		});
		expect(captured[0]?.groups).toEqual({ envelope: pieceCid });
	});
});
