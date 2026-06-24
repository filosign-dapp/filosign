import { describe, expect, test } from "bun:test";
import { validateSatelliteRulesForSend } from "../utils/satellite-validation";

const routing = {
	quorumN: 3,
	signerCount: 4,
	requiredSignerCount: 4,
};

const signerEmails = [
	"a@example.com",
	"b@example.com",
	"c@example.com",
	"d@example.com",
];

const payer = "0x1111111111111111111111111111111111111111" as const;
const recipient = "0x2222222222222222222222222222222222222222" as const;

describe("validateSatelliteRulesForSend", () => {
	test("rejects quorum_required threshold mismatch on payout", () => {
		const result = validateSatelliteRulesForSend({
			routing,
			signerEmails,
			payerAddress: payer,
			settlementDrafts: [
				{
					id: "leg-1",
					ruleId: "rule-1",
					recipientClientRowId: "row-1",
					recipientWallet: recipient,
					amountUsdc: "10",
					releaseType: "quorum_required",
					thresholdN: 2,
				},
			],
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.failure.scope).toBe("payout");
		}
	});

	test("rejects payer as payout recipient", () => {
		const result = validateSatelliteRulesForSend({
			routing,
			signerEmails,
			payerAddress: payer,
			settlementDrafts: [
				{
					id: "leg-1",
					ruleId: "rule-1",
					recipientClientRowId: "row-1",
					recipientWallet: payer,
					amountUsdc: "10",
					releaseType: "all_signed",
				},
			],
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.failure.message).toContain("payer");
		}
	});

	test("rejects expired payout rule", () => {
		const result = validateSatelliteRulesForSend({
			routing,
			signerEmails,
			payerAddress: payer,
			nowUnix: 1_700_000_000,
			settlementDrafts: [
				{
					id: "leg-1",
					ruleId: "rule-1",
					recipientClientRowId: "row-1",
					recipientWallet: recipient,
					amountUsdc: "10",
					releaseType: "all_signed",
					expiresAtUnix: 1_600_000_000,
				},
			],
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.failure.message).toContain("future");
		}
	});

	test("rejects at_least_n threshold above signer count", () => {
		const result = validateSatelliteRulesForSend({
			routing: { quorumN: 0, signerCount: 2, requiredSignerCount: 2 },
			signerEmails: ["a@example.com", "b@example.com"],
			payerAddress: payer,
			settlementDrafts: [
				{
					id: "leg-1",
					ruleId: "rule-1",
					recipientClientRowId: "row-1",
					recipientWallet: recipient,
					amountUsdc: "5",
					releaseType: "at_least_n",
					thresholdN: 3,
				},
			],
		});
		expect(result.ok).toBe(false);
	});

	test("rejects specific_signer without email on attachment", () => {
		const result = validateSatelliteRulesForSend({
			routing,
			signerEmails,
			attachmentDrafts: [
				{
					packetId: "packet-1",
					releaseMode: "conditional",
					releaseType: "specific_signer",
					recipientEmails: ["a@example.com"],
				},
			],
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.failure.scope).toBe("attachment");
		}
	});

	test("accepts valid payout and conditional attachment", () => {
		const result = validateSatelliteRulesForSend({
			routing,
			signerEmails,
			payerAddress: payer,
			settlementDrafts: [
				{
					id: "leg-1",
					ruleId: "rule-1",
					recipientClientRowId: "row-1",
					recipientWallet: recipient,
					amountUsdc: "10",
					releaseType: "quorum_required",
					thresholdN: 3,
				},
			],
			attachmentDrafts: [
				{
					packetId: "packet-1",
					releaseMode: "conditional",
					releaseType: "all_signed",
					recipientEmails: ["a@example.com", "b@example.com"],
				},
			],
		});
		expect(result.ok).toBe(true);
	});

	test("reports wallet missing when leg is configured but wallet unresolved", () => {
		const result = validateSatelliteRulesForSend({
			routing,
			signerEmails,
			payerAddress: payer,
			settlementDrafts: [
				{
					id: "leg-1",
					ruleId: "rule-1",
					recipientClientRowId: "row-1",
					amountUsdc: "10",
					releaseType: "all_signed",
				},
			],
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.failure.message).toContain("linked wallet");
		}
	});
});
