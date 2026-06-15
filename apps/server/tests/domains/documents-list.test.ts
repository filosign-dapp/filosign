import { describe, expect, test } from "bun:test";
import { zPlacementManifest } from "@filosign/shared";
import { getAddress } from "viem";
import {
	decodeListCursor,
	encodeListCursor,
} from "@/lib/domains/documents/utils/cursor";
import { mapDraftListRow } from "@/lib/domains/documents/utils/draft-row";
import {
	mapEnvelopeListRow,
	resolveEnvelopeLifecycle,
} from "@/lib/domains/documents/utils/envelope-row";
import { paginateDocumentListRows } from "@/lib/domains/documents/utils/paginate";
import { resolvePartyLabel } from "@/lib/domains/documents/utils/party-label";
import { escapeIlikePattern } from "@/lib/domains/documents/utils/search";

describe("documents.list", () => {
	test("encode/decode list cursor round-trips", () => {
		const updatedAt = new Date("2026-01-15T12:00:00.000Z");
		const id = "piece-abc";
		const encoded = encodeListCursor(updatedAt, id);
		const decoded = decodeListCursor(encoded);
		expect(decoded).toEqual({
			u: updatedAt.toISOString(),
			i: id,
		});
	});

	test("paginateDocumentListRows returns stable non-overlapping pages", () => {
		const rows = [
			{ updatedAt: new Date("2026-01-03T00:00:00.000Z"), id: "c", row: "c" },
			{ updatedAt: new Date("2026-01-02T00:00:00.000Z"), id: "b", row: "b" },
			{ updatedAt: new Date("2026-01-01T00:00:00.000Z"), id: "a", row: "a" },
		];
		const page1 = paginateDocumentListRows(rows, 2);
		expect(page1.items.map((x) => x.row)).toEqual(["c", "b"]);
		expect(page1.nextCursor).toBeTruthy();

		const cursor = decodeListCursor(page1.nextCursor ?? undefined);
		const page2Rows = rows.filter((entry) => {
			if (!cursor) return true;
			const cursorUpdatedAt = new Date(cursor.u);
			if (entry.updatedAt < cursorUpdatedAt) return true;
			if (entry.updatedAt > cursorUpdatedAt) return false;
			return entry.id < cursor.i;
		});
		const page2 = paginateDocumentListRows(page2Rows, 2);
		expect(page2.items.map((x) => x.row)).toEqual(["a"]);
		expect(page2.nextCursor).toBeNull();

		const page1Ids = new Set(page1.items.map((x) => x.id));
		for (const item of page2.items) {
			expect(page1Ids.has(item.id)).toBe(false);
		}
	});

	test("resolveEnvelopeLifecycle maps voided and completed", () => {
		expect(
			resolveEnvelopeLifecycle({
				completedAt: null,
				revokedBeforeCompletedAt: new Date(),
			}),
		).toBe("voided");
		expect(
			resolveEnvelopeLifecycle({
				completedAt: new Date(),
				revokedBeforeCompletedAt: null,
			}),
		).toBe("completed");
		expect(
			resolveEnvelopeLifecycle({
				completedAt: null,
				revokedBeforeCompletedAt: null,
			}),
		).toBe("active");
	});

	test("mapEnvelopeListRow sets direction from sender wallet", () => {
		const wallet = getAddress("0x1111111111111111111111111111111111111111");
		const sender = getAddress("0x2222222222222222222222222222222222222222");
		const received = mapEnvelopeListRow({
			pieceCid: "cid-1",
			displayName: "Contract",
			sender,
			wallet,
			completedAt: null,
			revokedBeforeCompletedAt: null,
			updatedAt: new Date(),
			ciphertextByteLength: 1024,
			signedByMe: false,
			metadataJson: null,
		});
		expect(received.direction).toBe("received");
		expect(received.party?.wallet).toBe(sender);

		const sent = mapEnvelopeListRow({
			pieceCid: "cid-2",
			displayName: "Contract",
			sender: wallet,
			wallet,
			completedAt: null,
			revokedBeforeCompletedAt: null,
			updatedAt: new Date(),
			ciphertextByteLength: 1024,
			signedByMe: true,
			metadataJson: null,
			signerSlotCount: 3,
			signedCount: 1,
		});
		expect(sent.direction).toBe("sent");
		expect(sent.signedByMe).toBe(true);
		expect(sent.signing).toEqual({ requiredCount: 3, signedCount: 1 });
		expect(sent.party).toBeUndefined();
	});

	test("mapEnvelopeListRow uses placement manifest signer count for self-sign sends", () => {
		const wallet = getAddress("0x1111111111111111111111111111111111111111");
		const hex32 = `0x${"ab".repeat(32)}` as const;
		const placementManifest = zPlacementManifest.parse({
			version: 1,
			documents: [
				{
					id: "doc1",
					name: "contract.pdf",
					sha256Plaintext: hex32,
					pageCount: 1,
				},
			],
			fields: [
				{
					id: "f1",
					documentId: "doc1",
					pageIndex: 0,
					rect: { x: 0.1, y: 0.2, width: 0.3, height: 0.05 },
					assignedRecipientEmail: "sender@example.com",
					required: true,
					type: "signature",
				},
				{
					id: "f2",
					documentId: "doc1",
					pageIndex: 0,
					rect: { x: 0.2, y: 0.3, width: 0.3, height: 0.05 },
					assignedRecipientEmail: "other@example.com",
					required: true,
					type: "signature",
				},
			],
		});

		const sent = mapEnvelopeListRow({
			pieceCid: "cid-self-sign",
			displayName: "Contract",
			sender: wallet,
			wallet,
			completedAt: null,
			revokedBeforeCompletedAt: null,
			updatedAt: new Date(),
			ciphertextByteLength: 1024,
			signedByMe: true,
			metadataJson: null,
			signerSlotCount: 1,
			signedCount: 2,
			placementManifestJson: placementManifest,
		});

		expect(sent.signing).toEqual({ requiredCount: 2, signedCount: 2 });
	});

	test("resolvePartyLabel prefers name, then email local-part, then wallet", () => {
		const wallet = getAddress("0x1111111111111111111111111111111111111111");
		expect(
			resolvePartyLabel(
				{
					firstName: "Ada",
					lastName: "Lovelace",
					email: "ada@example.com",
					username: "ada",
				},
				wallet,
			),
		).toBe("Ada Lovelace");
		expect(
			resolvePartyLabel(
				{
					firstName: null,
					lastName: null,
					email: "ada@example.com",
					username: null,
				},
				wallet,
			),
		).toBe("ada");
		expect(resolvePartyLabel(null, wallet)).toContain("0x1111");
	});

	test("escapeIlikePattern escapes wildcard characters", () => {
		expect(escapeIlikePattern("50%_off")).toBe("50\\%\\_off");
	});

	test("mapDraftListRow exposes summed document bytes", () => {
		const wallet = getAddress("0x1111111111111111111111111111111111111111");
		const withSize = mapDraftListRow({
			id: "00000000-0000-7000-8000-000000000001",
			title: "NDA",
			updatedAt: new Date(),
			createdByWallet: wallet,
			sizeBytes: 2048,
		});
		expect(withSize.sizeBytes).toBe(2048);

		const empty = mapDraftListRow({
			id: "00000000-0000-7000-8000-000000000002",
			title: "Empty",
			updatedAt: new Date(),
			createdByWallet: wallet,
			sizeBytes: 0,
		});
		expect(empty.sizeBytes).toBeNull();
	});
});
