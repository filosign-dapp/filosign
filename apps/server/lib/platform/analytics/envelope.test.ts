import { describe, expect, test } from "bun:test";
import {
	envelopeAnalyticsContext,
	PIECE_CID_PROPERTY,
	POSTHOG_ENVELOPE_GROUP,
} from "./envelope";

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
