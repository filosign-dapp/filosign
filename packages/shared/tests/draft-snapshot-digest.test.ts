import { describe, expect, it } from "bun:test";
import {
	canonicalDraftSnapshotJson,
	type DraftSnapshot,
	digestDraftSnapshot,
} from "..";

const minimalSnapshot = (): DraftSnapshot => ({
	recipients: [
		{
			name: "A",
			email: "a@example.com",
			role: "signer",
		},
	],
	emailSubject: "Subject",
	emailMessage: "Body",
	signatureFields: [],
	settlementDrafts: [],
	placementManifest: {
		version: 2,
		fields: [
			{
				id: "f1",
				pageIndex: 0,
				rect: { x: 0.1, y: 0.2, width: 0.3, height: 0.1 },
				assignedRecipientEmail: "a@example.com",
				required: true,
				type: "signature",
			},
		],
	},
	documents: [{ id: "d1", name: "a.pdf", size: 100, type: "application/pdf" }],
});

describe("digestDraftSnapshot", () => {
	it("is stable across key order in parsed objects", () => {
		const a = minimalSnapshot();
		const b = {
			...minimalSnapshot(),
			documents: [
				{ type: "application/pdf", id: "d1", name: "a.pdf", size: 100 },
			],
		};
		expect(digestDraftSnapshot(a)).toBe(digestDraftSnapshot(b));
	});

	it("canonical JSON is stable on repeat", () => {
		const snap = minimalSnapshot();
		expect(canonicalDraftSnapshotJson(snap)).toBe(
			canonicalDraftSnapshotJson(snap),
		);
	});

	it("changes when snapshot content changes", () => {
		const a = minimalSnapshot();
		const b = { ...minimalSnapshot(), emailSubject: "Other" };
		expect(digestDraftSnapshot(a)).not.toBe(digestDraftSnapshot(b));
	});

	it("accepts an empty placement manifest (compose before add-sign fields)", () => {
		const snap: DraftSnapshot = {
			...minimalSnapshot(),
			signatureFields: [],
			placementManifest: { version: 2, fields: [] },
		};
		expect(() => digestDraftSnapshot(snap)).not.toThrow();
	});
});
