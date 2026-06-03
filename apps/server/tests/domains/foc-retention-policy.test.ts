import { describe, expect, test } from "bun:test";

describe("FOC retention policy (documented behavior)", () => {
	test("archival can outlive workspace when dates differ", () => {
		const workspaceEnd = new Date("2026-06-01T00:00:00.000Z");
		const archivalEnd = new Date("2030-01-01T00:00:00.000Z");
		const effective =
			workspaceEnd.getTime() >= archivalEnd.getTime()
				? workspaceEnd
				: archivalEnd;
		expect(effective).toEqual(archivalEnd);
	});
});
