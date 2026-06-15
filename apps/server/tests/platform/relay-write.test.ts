import { describe, expect, test } from "bun:test";
import { ORPCError } from "@orpc/server";
import type { TransactionReceipt } from "viem";
import { relayWrite } from "@/lib/platform/evm/relay-write";

function relayReceipt(
	status: TransactionReceipt["status"],
): TransactionReceipt {
	return { status } as TransactionReceipt;
}

describe("relayWrite", () => {
	test("returns hash when receipt succeeds", async () => {
		const hash = "0x1234" as `0x${string}`;
		const result = await relayWrite({
			step: "registerEnvelope",
			write: async () => hash,
			waitForReceipt: async () => relayReceipt("success"),
		});
		expect(result).toBe(hash);
	});

	test("throws ORPCError when receipt is reverted", async () => {
		await expect(
			relayWrite({
				step: "registerEnvelope",
				write: async () => "0xabcd" as `0x${string}`,
				waitForReceipt: async () => relayReceipt("reverted"),
			}),
		).rejects.toBeInstanceOf(ORPCError);
	});

	test("submits the write before waiting for the receipt", async () => {
		const order: string[] = [];

		await relayWrite({
			step: "registerEnvelope",
			write: async () => {
				order.push("write");
				return "0x1234" as `0x${string}`;
			},
			waitForReceipt: async () => {
				order.push("receipt");
				return relayReceipt("success");
			},
		});

		expect(order).toEqual(["write", "receipt"]);
	});
});
