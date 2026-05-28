import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import {
	envelopeAnalyticsContext,
	PIECE_CID_PROPERTY,
	POSTHOG_ENVELOPE_GROUP,
} from "@/lib/platform/analytics/envelope";
import { SERVER_ANALYTICS_EVENTS } from "@/lib/platform/analytics/events";

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
	const { resetPostHogClientForTests } = await import(
		"@/lib/platform/analytics/posthog"
	);
	resetPostHogClientForTests();
});

afterEach(async () => {
	const { resetPostHogClientForTests } = await import(
		"@/lib/platform/analytics/posthog"
	);
	resetPostHogClientForTests();
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

describe("envelopeAnalyticsContext", () => {
	test("maps piece CID to property and PostHog group", () => {
		const cid =
			"bafkzcibey2damdvpptrsdqvstcplmzrlquc5r2fm5azoknjeoifwbottyhyyywnjgm";
		const ctx = envelopeAnalyticsContext(cid);
		expect(ctx.properties[PIECE_CID_PROPERTY]).toBe(cid);
		expect(ctx.groups[POSTHOG_ENVELOPE_GROUP]).toBe(cid);
	});

	test("trims whitespace", () => {
		const ctx = envelopeAnalyticsContext("  bafkreitest  ");
		expect(ctx.properties.piece_cid).toBe("bafkreitest");
		expect(ctx.groups.envelope).toBe("bafkreitest");
	});
});

describe("captureEvent with PostHog enabled", () => {
	test("forwards envelope group on capture", async () => {
		const { captureEvent } = await import("@/lib/platform/analytics/posthog");
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

describe("trackServerEvent", () => {
	test("does not throw when PostHog is disabled", async () => {
		process.env.POSTHOG_ENABLED = "false";
		delete process.env.POSTHOG_API_KEY;
		const { resetPostHogClientForTests } = await import(
			"@/lib/platform/analytics/posthog"
		);
		resetPostHogClientForTests();
		const { trackServerEvent } = await import("@/lib/platform/analytics/track");
		expect(() =>
			trackServerEvent({
				distinctId: "0x0000000000000000000000000000000000000001",
				event: SERVER_ANALYTICS_EVENTS.userRegistered,
			}),
		).not.toThrow();
	});

	test("does not throw when PostHog is disabled with pieceCid", async () => {
		const { trackServerEvent } = await import("@/lib/platform/analytics/track");
		expect(() =>
			trackServerEvent({
				distinctId: "0x0000000000000000000000000000000000000001",
				event: SERVER_ANALYTICS_EVENTS.fileRegistered,
				pieceCid: "bafkzcibetest",
			}),
		).not.toThrow();
	});

	test("merges pieceCid into properties and groups when enabled", async () => {
		process.env.POSTHOG_ENABLED = "true";
		process.env.POSTHOG_API_KEY = "phc_test";
		const { resetPostHogClientForTests } = await import(
			"@/lib/platform/analytics/posthog"
		);
		resetPostHogClientForTests();
		const { trackServerEvent } = await import("@/lib/platform/analytics/track");
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
