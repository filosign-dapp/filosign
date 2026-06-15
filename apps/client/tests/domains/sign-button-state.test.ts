import { describe, expect, test } from "bun:test";
import {
	resolveSignButtonDisabledReason,
	shouldShowSignButton,
} from "@/src/routes/dashboard/document/sign/-lib/utils/sign-button-state";

const baseReady = {
	canSubmitSign: false,
	canSign: true,
	canSignByRouting: true,
	signerReplacementPending: false,
	canSubmitPlacementSign: true,
	docReady: true,
	isSender: false,
	acknowledged: true,
	firstViewedAt: "2026-06-15T00:00:00.000Z",
} as const;

describe("sign button state", () => {
	test("shows when signer has assigned fields even if canSign is false", () => {
		expect(
			shouldShowSignButton({
				signerAddress: "0xabc",
				alreadySigned: false,
				canSign: false,
				assignedFieldCount: 3,
			}),
		).toBe(true);
	});

	test("hides when already signed", () => {
		expect(
			shouldShowSignButton({
				signerAddress: "0xabc",
				alreadySigned: true,
				canSign: false,
				assignedFieldCount: 3,
			}),
		).toBe(false);
	});

	test("returns null when sign may proceed", () => {
		expect(
			resolveSignButtonDisabledReason({
				...baseReady,
				canSubmitSign: true,
			}),
		).toBeNull();
	});

	test("routing gate explains why sign is disabled", () => {
		expect(
			resolveSignButtonDisabledReason({
				...baseReady,
				canSign: false,
				isSender: true,
				firstViewedAt: null,
				canSignByRouting: false,
			}),
		).toMatch(/not your turn/i);
	});

	test("incomplete fields explain why sign is disabled", () => {
		expect(
			resolveSignButtonDisabledReason({
				...baseReady,
				canSubmitPlacementSign: false,
			}),
		).toMatch(/required field/i);
	});

	test("document loading explains why sign is disabled", () => {
		expect(
			resolveSignButtonDisabledReason({
				...baseReady,
				docReady: false,
			}),
		).toMatch(/loading/i);
	});

	test("acknowledgement gate explains why sign is disabled", () => {
		expect(
			resolveSignButtonDisabledReason({
				...baseReady,
				canSign: false,
				acknowledged: false,
				firstViewedAt: null,
			}),
		).toMatch(/acknowledge/i);
	});

	test("first view gate explains why sign is disabled", () => {
		expect(
			resolveSignButtonDisabledReason({
				...baseReady,
				firstViewedAt: null,
			}),
		).toMatch(/review the document/i);
	});

	test("signer replacement explains why sign is disabled", () => {
		expect(
			resolveSignButtonDisabledReason({
				...baseReady,
				signerReplacementPending: true,
			}),
		).toMatch(/signer change/i);
	});

	test("always returns a reason when submit is blocked", () => {
		expect(
			resolveSignButtonDisabledReason({
				...baseReady,
				canSubmitSign: false,
			}),
		).not.toBeNull();
	});
});
