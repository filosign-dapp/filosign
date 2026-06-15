import { describe, expect, test } from "bun:test";
import type { DocumentListRow } from "@filosign/react/documents";
import { resolveDocumentRowStatus } from "@/src/lib/domains/documents/document-row-status";

function envelopeRow(
	overrides: Partial<Extract<DocumentListRow, { kind: "envelope" }>> &
		Pick<Extract<DocumentListRow, { kind: "envelope" }>, "direction">,
): Extract<DocumentListRow, { kind: "envelope" }> {
	return {
		kind: "envelope",
		id: "bafy-test",
		title: "Test envelope",
		lifecycle: "active",
		updatedAt: "2026-01-01T00:00:00.000Z",
		sizeBytes: 1024,
		signedByMe: false,
		...overrides,
	};
}

function draftRow(): Extract<DocumentListRow, { kind: "draft" }> {
	return {
		kind: "draft",
		id: "00000000-0000-4000-8000-000000000001",
		title: "Draft envelope",
		updatedAt: "2026-01-01T00:00:00.000Z",
		createdByWallet: "0x0000000000000000000000000000000000000001",
		sizeBytes: 512,
	};
}

describe("resolveDocumentRowStatus", () => {
	test("draft row is muted Draft", () => {
		expect(resolveDocumentRowStatus(draftRow())).toEqual({
			label: "Draft",
			tone: "muted",
		});
	});

	test("sent completed is success", () => {
		expect(
			resolveDocumentRowStatus(
				envelopeRow({ direction: "sent", lifecycle: "completed" }),
			),
		).toMatchObject({
			label: "Completed",
			tone: "success",
			directionLabel: "Sent",
		});
	});

	test("sent active with signing progress is warning", () => {
		expect(
			resolveDocumentRowStatus(
				envelopeRow({
					direction: "sent",
					lifecycle: "active",
					signing: { signedCount: 2, requiredCount: 2 },
				}),
			),
		).toMatchObject({
			label: "2/2 signed",
			tone: "warning",
			directionLabel: "Sent",
		});
	});

	test("sent active with partial signing progress is warning", () => {
		expect(
			resolveDocumentRowStatus(
				envelopeRow({
					direction: "sent",
					lifecycle: "active",
					signing: { signedCount: 2, requiredCount: 3 },
				}),
			),
		).toMatchObject({
			label: "2/3 signed",
			tone: "warning",
			directionLabel: "Sent",
		});
	});

	test("sent active without signing is in progress", () => {
		expect(
			resolveDocumentRowStatus(
				envelopeRow({ direction: "sent", lifecycle: "active" }),
			),
		).toMatchObject({
			label: "In progress",
			tone: "warning",
			directionLabel: "Sent",
		});
	});

	test("received unsigned needs signature", () => {
		expect(
			resolveDocumentRowStatus(
				envelopeRow({
					direction: "received",
					signedByMe: false,
				}),
			),
		).toMatchObject({
			label: "Needs signature",
			tone: "primary",
			directionLabel: "Received",
		});
	});

	test("received signed while active", () => {
		expect(
			resolveDocumentRowStatus(
				envelopeRow({
					direction: "received",
					signedByMe: true,
					lifecycle: "active",
				}),
			),
		).toMatchObject({
			label: "Signed by you",
			tone: "secondary",
			directionLabel: "Received",
		});
	});

	test("voided envelope is destructive", () => {
		expect(
			resolveDocumentRowStatus(
				envelopeRow({
					direction: "received",
					lifecycle: "voided",
					signedByMe: true,
				}),
			),
		).toMatchObject({
			label: "Voided",
			tone: "destructive",
			directionLabel: "Received",
		});
	});

	test("received completed is success", () => {
		expect(
			resolveDocumentRowStatus(
				envelopeRow({
					direction: "received",
					lifecycle: "completed",
					signedByMe: true,
				}),
			),
		).toMatchObject({
			label: "Completed",
			tone: "success",
			directionLabel: "Received",
		});
	});
});
