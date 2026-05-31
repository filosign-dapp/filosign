import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("tx-receipt registration flow", () => {
	it("settlement registration waits for receipts and parses PaymentRuleRegistered", () => {
		const src = readFileSync(
			join(import.meta.dir, "../src/lib/settlement-rules.ts"),
			"utf8",
		);
		expect(src).toContain("waitForTxReceipt(args.contracts, approveHash)");
		expect(src).toContain(
			"waitForTxReceipt(\n\t\t\targs.contracts,\n\t\t\tregisterHash",
		);
		expect(src).toContain('eventName: "PaymentRuleRegistered"');
		expect(src).not.toContain("await validator.read.nextRuleId()");
	});

	it("attachment registration waits for receipts and parses AttachmentRuleRegistered", () => {
		const src = readFileSync(
			join(import.meta.dir, "../src/lib/register-attachment-rules.ts"),
			"utf8",
		);
		expect(src).toContain(
			"waitForTxReceipt(\n\t\t\targs.contracts,\n\t\t\tregisterHash",
		);
		expect(src).toContain('eventName: "AttachmentRuleRegistered"');
		expect(src).not.toContain("await release.read.nextRuleId()");
	});
});
