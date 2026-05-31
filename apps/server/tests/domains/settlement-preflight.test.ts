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

describe("wrapAttachmentPacketDekForWarm", () => {
	test("normalizes recipient email in KEM info", () => {
		const src = readFileSync(
			join(
				import.meta.dir,
				"../../../../packages/react-sdk/src/lib/attachment-packets.ts",
			),
			"utf8",
		);
		expect(src).toContain(
			"normalizePlacementRecipientEmail(args.recipient.email)",
		);
	});
});

describe("tryExecuteSettlementPayout", () => {
	test("loads settlement rules by validatorAddress and onChainRuleId", () => {
		const src = readFileSync(
			join(
				import.meta.dir,
				"../../lib/domains/settlements/utils/execute-payout.ts",
			),
			"utf8",
		);
		expect(src).toContain(
			"selectSettlementRule(onChainRuleId, validatorAddress)",
		);
		expect(src).not.toMatch(
			/eq\(fileSettlementRules\.onChainRuleId,\s*onChainRuleId\)[\s\S]*?\.limit\(1\)/,
		);
	});

	test("simulates executePayoutLeg before broadcasting write", () => {
		const src = readFileSync(
			join(
				import.meta.dir,
				"../../lib/domains/settlements/utils/execute-payout.ts",
			),
			"utf8",
		);
		expect(src).toContain("validator.simulate.executePayoutLeg");
		expect(src).toContain("writeValidator.executePayoutLeg");
		const simIdx = src.indexOf("validator.simulate.executePayoutLeg");
		const writeIdx = src.indexOf("writeValidator.executePayoutLeg");
		expect(simIdx).toBeGreaterThan(-1);
		expect(writeIdx).toBeGreaterThan(simIdx);
	});
});
