import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("payerCanFundSettlement", () => {
	test("reads rule state via fsPaymentValidatorAt(args.validator)", () => {
		const src = readFileSync(
			join(import.meta.dir, "../../lib/domains/settlements/utils/preflight.ts"),
			"utf8",
		);
		expect(src).toContain("fsPaymentValidatorAt(args.validator)");
		expect(src).not.toMatch(
			/const validator = fsContracts\.FSPaymentValidator/,
		);
	});
});

describe("tryExecuteSettlementPayout", () => {
	test("simulates executePayout before broadcasting write", () => {
		const src = readFileSync(
			join(
				import.meta.dir,
				"../../lib/domains/settlements/utils/execute-payout.ts",
			),
			"utf8",
		);
		expect(src).toContain("validator.simulate.executePayout");
		expect(src).toContain("validator.write");
		const simIdx = src.indexOf("validator.simulate.executePayout");
		const writeIdx = src.indexOf("validator.write");
		expect(simIdx).toBeGreaterThan(-1);
		expect(writeIdx).toBeGreaterThan(simIdx);
	});
});
