import { describe, expect, test } from "bun:test";
import { isOrgAtSeatCapacity } from "@/src/lib/domains/workspace/use-invite-teammate-gate";

describe("isOrgAtSeatCapacity", () => {
	test("returns false when billing summary is still loading", () => {
		expect(isOrgAtSeatCapacity(undefined, 5)).toBe(false);
		expect(isOrgAtSeatCapacity(2, undefined)).toBe(false);
	});

	test("returns true when used seats meet or exceed purchased seats", () => {
		expect(isOrgAtSeatCapacity(2, 2)).toBe(true);
		expect(isOrgAtSeatCapacity(3, 2)).toBe(true);
	});

	test("returns false when seats remain", () => {
		expect(isOrgAtSeatCapacity(1, 3)).toBe(false);
	});
});
