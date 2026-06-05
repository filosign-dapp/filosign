import { describe, expect, test } from "bun:test";
import { resolveDodoLiveMode } from "@/lib/domains/billing/utils/mode";

describe("resolveDodoLiveMode", () => {
	test("production defaults to live when DODO_LIVE unset", () => {
		expect(resolveDodoLiveMode({ deployment: "production" })).toBe(true);
	});

	test("DODO_LIVE=false forces test on production", () => {
		expect(
			resolveDodoLiveMode({
				deployment: "production",
				dodoLiveEnv: "false",
			}),
		).toBe(false);
	});

	test("staging stays test when DODO_LIVE unset", () => {
		expect(resolveDodoLiveMode({ deployment: "staging" })).toBe(false);
	});
});
