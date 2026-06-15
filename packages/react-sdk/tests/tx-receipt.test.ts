import { describe, expect, test } from "bun:test";
import type { FilosignContracts } from "@filosign/evm";
import {
	ContractFunctionRevertedError,
	type Hash,
	type PublicClient,
	type TransactionReceipt,
} from "viem";
import { waitForTxReceipt } from "../src/lib/tx-receipt";

const hash = `0x${"cc".repeat(32)}` as Hash;
const blockNumber = 42n;

const contracts = {
	$client: { chain: { id: 84532 } },
} as FilosignContracts;

function mockClient(args: {
	receiptStatus: TransactionReceipt["status"];
	callError?: unknown;
}): PublicClient {
	return {
		waitForTransactionReceipt: async () =>
			({
				status: args.receiptStatus,
				blockNumber,
				logs: [],
			}) as unknown as TransactionReceipt,
		getTransaction: async () => ({
			to: "0x1111111111111111111111111111111111111111",
			input: "0x",
		}),
		call: async () => {
			if (args.callError) {
				throw args.callError;
			}
		},
	} as unknown as PublicClient;
}

describe("waitForTxReceipt", () => {
	test("returns receipt when transaction succeeds", async () => {
		const client = mockClient({ receiptStatus: "success" });

		const receipt = await waitForTxReceipt(contracts, hash, { client });

		expect(receipt.status).toBe("success");
	});

	test("throws labeled error with friendly revert message on failure", async () => {
		const client = mockClient({
			receiptStatus: "reverted",
			callError: new ContractFunctionRevertedError({
				abi: [],
				functionName: "registerRule",
				message: "FileNotRegistered()",
			}),
		});

		await expect(
			waitForTxReceipt(contracts, hash, {
				label: "Payout registration",
				client,
			}),
		).rejects.toThrow(
			"Payout registration failed: This document isn't registered yet.",
		);
	});

	test("throws generic label when options.label is omitted", async () => {
		const client = mockClient({
			receiptStatus: "reverted",
			callError: new ContractFunctionRevertedError({
				abi: [],
				functionName: "registerRule",
				message: "RuleNotExecutable()",
			}),
		});

		await expect(waitForTxReceipt(contracts, hash, { client })).rejects.toThrow(
			"Transaction failed: This payout isn't ready yet.",
		);
	});
});
