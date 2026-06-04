import { describe, expect, test } from "bun:test";
import {
	assertSignOrdering,
	isValidAckSignature,
} from "@/lib/domains/files/utils/piece-helpers";

describe("participant-access", () => {
	test("isValidAckSignature accepts EIP-712-length hex", () => {
		const sig = `0x${"ab".repeat(65)}`;
		expect(isValidAckSignature(sig)).toBe(true);
	});

	test("isValidAckSignature rejects short hex", () => {
		expect(isValidAckSignature("0x1234")).toBe(false);
	});

	test("assertSignOrdering enforces ack → view → sign", () => {
		const ack = new Date("2026-01-01T00:00:00.000Z");
		const view = new Date("2026-01-01T00:01:00.000Z");
		const sign = new Date("2026-01-01T00:02:00.000Z");
		expect(() => assertSignOrdering(ack, view, sign)).not.toThrow();
	});

	test("assertSignOrdering rejects view before ack", () => {
		const ack = new Date("2026-01-01T00:02:00.000Z");
		const view = new Date("2026-01-01T00:01:00.000Z");
		const sign = new Date("2026-01-01T00:03:00.000Z");
		expect(() => assertSignOrdering(ack, view, sign)).toThrow();
	});

	test("assertSignOrdering rejects sign before view (stale chain timestamp case)", () => {
		const ack = new Date("2026-01-01T00:00:00.000Z");
		const view = new Date("2026-01-01T00:01:00.000Z");
		const staleChainSignAt = new Date("2026-01-01T00:00:30.000Z");
		expect(() => assertSignOrdering(ack, view, staleChainSignAt)).toThrow(
			/Open the document first/,
		);
	});
});
