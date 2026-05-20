import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { SERVER_ANALYTICS_EVENTS } from "./events";
import { trackServerEvent } from "./track";

const priorEnabled = process.env.POSTHOG_ENABLED;
const priorKey = process.env.POSTHOG_API_KEY;

beforeEach(() => {
	process.env.POSTHOG_ENABLED = "false";
	delete process.env.POSTHOG_API_KEY;
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

describe("trackServerEvent", () => {
	test("does not throw when PostHog is disabled", () => {
		expect(() =>
			trackServerEvent({
				distinctId: "0x0000000000000000000000000000000000000001",
				event: SERVER_ANALYTICS_EVENTS.userRegistered,
			}),
		).not.toThrow();
	});

	test("does not throw when PostHog is disabled with pieceCid", () => {
		expect(() =>
			trackServerEvent({
				distinctId: "0x0000000000000000000000000000000000000001",
				event: SERVER_ANALYTICS_EVENTS.fileRegistered,
				pieceCid: "bafkzcibetest",
			}),
		).not.toThrow();
	});
});
