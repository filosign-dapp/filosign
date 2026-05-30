import { describe, expect, it } from "bun:test";
import type { Hex } from "viem";
import { releaseParamsToContractArgs } from "../src/lib/settlement-rules";

const COMMIT_A = `0x${"aa".repeat(32)}` as Hex;
const COMMIT_B = `0x${"bb".repeat(32)}` as Hex;
const COMMIT_C = `0x${"cc".repeat(32)}` as Hex;

describe("settlement-rules lib", () => {
	it("maps all_signed to zero contract args", () => {
		const args = releaseParamsToContractArgs("all_signed", {
			releaseType: "all_signed",
		});
		expect(args.thresholdN).toBe(0);
		expect(args.signerCommitments).toEqual([]);
	});

	it("maps quorum_set with commitments", () => {
		const args = releaseParamsToContractArgs("quorum_set", {
			releaseType: "quorum_set",
			thresholdN: 2,
			signerEmailCommitments: [COMMIT_A, COMMIT_B, COMMIT_C],
		});
		expect(args.thresholdN).toBe(2);
		expect(args.signerCommitments).toHaveLength(3);
	});

	it("maps all_of_set commitments without threshold", () => {
		const args = releaseParamsToContractArgs("all_of_set", {
			releaseType: "all_of_set",
			signerEmailCommitments: [COMMIT_A, COMMIT_B],
		});
		expect(args.thresholdN).toBe(0);
		expect(args.signerCommitments).toEqual([COMMIT_A, COMMIT_B]);
	});
});
