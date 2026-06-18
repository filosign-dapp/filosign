import { describe, expect, test } from "bun:test";
import { LOADING_INDICATOR_DELAY_MS } from "@/src/lib/utils/use-delayed-loading";

describe("LOADING_INDICATOR_DELAY_MS", () => {
	test("waits below one second before showing loading UI", () => {
		expect(LOADING_INDICATOR_DELAY_MS).toBe(400);
	});
});
