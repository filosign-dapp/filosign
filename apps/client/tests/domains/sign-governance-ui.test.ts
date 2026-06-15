import { describe, expect, test } from "bun:test";
import {
	envelopeOpenForGovernance,
	senderToolsClosedCopy,
	unsignedSignerOptionsFromFile,
} from "@/src/routes/dashboard/document/sign/-lib/utils/governance";

describe("envelopeOpenForGovernance", () => {
	test("allows governance for an open sender envelope", () => {
		expect(
			envelopeOpenForGovernance({
				isSender: true,
				envelopeProgress: {
					routingMode: 0,
					requiredSignersCount: 2,
					requiredSignaturesCount: 0,
					quorumN: 0,
					nextSignerEmail: null,
				},
				pendingSignerReplacement: false,
			}),
		).toBe(true);
	});

	test("blocks governance when complete, voided, or replacement pending", () => {
		const base = {
			isSender: true,
			envelopeProgress: {
				routingMode: 0,
				requiredSignersCount: 2,
				requiredSignaturesCount: 1,
				quorumN: 0,
				nextSignerEmail: null,
			},
		};

		expect(
			envelopeOpenForGovernance({
				...base,
				envelopeProgress: {
					...base.envelopeProgress,
					completedAt: 1,
				},
				pendingSignerReplacement: false,
			}),
		).toBe(false);

		expect(
			envelopeOpenForGovernance({
				...base,
				envelopeProgress: {
					...base.envelopeProgress,
					revokedBeforeCompletedAt: 1,
				},
				pendingSignerReplacement: false,
			}),
		).toBe(false);

		expect(
			envelopeOpenForGovernance({
				...base,
				pendingSignerReplacement: true,
			}),
		).toBe(false);
	});
});

describe("senderToolsClosedCopy", () => {
	test("returns lifecycle-specific copy", () => {
		expect(
			senderToolsClosedCopy({
				envelopeProgress: { completedAt: 1 },
				pendingSignerReplacement: false,
			}),
		).toContain("complete");

		expect(
			senderToolsClosedCopy({
				envelopeProgress: { revokedBeforeCompletedAt: 1 },
				pendingSignerReplacement: false,
			}),
		).toContain("voided");

		expect(
			senderToolsClosedCopy({
				envelopeProgress: null,
				pendingSignerReplacement: true,
			}),
		).toContain("roster change");
	});
});

describe("unsignedSignerOptionsFromFile", () => {
	test("excludes signed wallets and invite-pending rows", () => {
		const options = unsignedSignerOptionsFromFile(
			[
				{
					wallet: "0x0000000000000000000000000000000000000001",
					email: "alice@example.com",
					name: "Alice",
				},
				{
					wallet: "0x0000000000000000000000000000000000000002",
					email: "bob@example.com",
					name: "Bob",
				},
				{
					wallet: "0x0000000000000000000000000000000000000000",
					email: "cold@example.com",
					invitePending: true,
				},
			],
			[
				{
					signer: "0x0000000000000000000000000000000000000001",
				},
			],
		);

		expect(options.map((option) => option.email)).toEqual(["bob@example.com"]);
	});
});
