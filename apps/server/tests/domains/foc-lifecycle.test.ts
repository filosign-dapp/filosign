import { describe, expect, test } from "bun:test";
import {
	isFocTransitionDiscoverable,
	shouldDeferFocTransition,
	shouldDeferFocTransitionForJob,
} from "@/lib/domains/foc/lifecycle";

describe("FOC transition policy", () => {
	test("defers in hot window until sender exports", () => {
		expect(
			shouldDeferFocTransition({ inHotWindow: true, senderExported: false }),
		).toBe(true);
		expect(
			shouldDeferFocTransition({ inHotWindow: true, senderExported: true }),
		).toBe(false);
	});

	test("does not defer after hot window", () => {
		expect(
			shouldDeferFocTransition({ inHotWindow: false, senderExported: false }),
		).toBe(false);
	});

	test("discovers early when sender exported during hot window", () => {
		expect(
			isFocTransitionDiscoverable({ inHotWindow: true, senderExported: true }),
		).toBe(true);
		expect(
			isFocTransitionDiscoverable({
				inHotWindow: true,
				senderExported: false,
			}),
		).toBe(false);
	});

	test("discovers after hot window regardless of export", () => {
		expect(
			isFocTransitionDiscoverable({
				inHotWindow: false,
				senderExported: false,
			}),
		).toBe(true);
	});

	test("TEST_FOC bypasses deferral during hot window", () => {
		expect(
			shouldDeferFocTransitionForJob({
				inHotWindow: true,
				senderExported: false,
				testFocEnabled: true,
			}),
		).toBe(false);
	});
});
