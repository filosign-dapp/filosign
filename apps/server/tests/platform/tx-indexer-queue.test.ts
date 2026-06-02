import { describe, expect, mock, test } from "bun:test";

const addMock = mock(
	async (_args: { txHash: string; body: Record<string, unknown> }) => ({
		id: "indexer__0xabc",
	}),
);

mock.module("@/lib/platform/jobs", () => ({
	enqueueIndexerTransaction: async (args: {
		txHash: string;
		body: Record<string, unknown>;
	}) => {
		await addMock(args);
	},
}));

describe("txProcessIndexerHash", () => {
	test("returns queued contract without blocking on receipt", async () => {
		const { txProcessIndexerHash } = await import("@/api/handlers/tx");
		const result = await txProcessIndexerHash(
			{
				hash: "0x0000000000000000000000000000000000000000000000000000000000000001",
			},
			{},
		);
		expect(result).toEqual({
			queued: true,
			txHash:
				"0x0000000000000000000000000000000000000000000000000000000000000001",
		});
		expect(addMock).toHaveBeenCalledTimes(1);
	});
});
