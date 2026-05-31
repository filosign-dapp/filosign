import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("settlement receipt verification", () => {
	test("assertTxSucceeded waits for mined receipts", () => {
		const src = readFileSync(
			join(
				import.meta.dir,
				"../../lib/domains/settlements/utils/verify-rules-on-chain.ts",
			),
			"utf8",
		);
		expect(src).toContain("evmClient.waitForTransactionReceipt({ hash })");
		expect(src).not.toContain("evmClient.getTransactionReceipt({ hash })");
	});
});
