import { describe, expect, test } from "bun:test";

describe("useAttachSettlementForFile", () => {
	test("exports attach settlement mutation hook", async () => {
		const mod = await import("./useAttachSettlementForFile");
		expect(typeof mod.useAttachSettlementForFile).toBe("function");
	});
});
