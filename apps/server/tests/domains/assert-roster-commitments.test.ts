import { describe, expect, test } from "bun:test";
import type { SettlementRuleRegistrationInput } from "@filosign/shared";
import { collectSettlementReleaseSignerCommitments } from "@/lib/domains/files/utils/assert-roster-commitments";

describe("assert-roster-commitments", () => {
	test("collectSettlementReleaseSignerCommitments returns roster-bound commitments only", () => {
		const specificRule = {
			releaseType: "specific_signer",
			releaseParams: {
				releaseType: "specific_signer",
				signerEmailCommitment:
					"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
			},
		} as Pick<SettlementRuleRegistrationInput, "releaseType" | "releaseParams">;

		expect(
			collectSettlementReleaseSignerCommitments({
				...specificRule,
				onChainRuleId: "1",
				legs: [],
				tokenAddress: "0x0000000000000000000000000000000000000001",
				cidIdentifier:
					"0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
				registerRuleTxHash:
					"0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
				approveTxHash:
					"0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
			}),
		).toEqual([
			"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
		]);

		expect(
			collectSettlementReleaseSignerCommitments({
				releaseType: "all_signed",
				releaseParams: { releaseType: "all_signed" },
				onChainRuleId: "1",
				legs: [],
				tokenAddress: "0x0000000000000000000000000000000000000001",
				cidIdentifier:
					"0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
				registerRuleTxHash:
					"0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
				approveTxHash:
					"0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
			}),
		).toEqual([]);
	});
});
