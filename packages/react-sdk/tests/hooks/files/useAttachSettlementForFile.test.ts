import { describe, expect, test } from "bun:test";

describe("useAttachSettlementForFile", () => {
	test("exports attach settlement mutation hook", async () => {
		const mod = await import(
			"../../../src/hooks/files/useAttachSettlementForFile"
		);
		expect(typeof mod.useAttachSettlementForFile).toBe("function");
	});
});
