import { describe, expect, it } from "bun:test";
import {
	applyRoleAssignments,
	type DraftSnapshot,
	draftSnapshotToTemplateSnapshot,
	zPlacementManifest,
	zTemplateSnapshot,
} from "..";

const draftSnapshot: DraftSnapshot = {
	recipients: [
		{
			name: "Alice",
			email: "alice@example.com",
			role: "signer",
		},
		{
			name: "Bob",
			email: "bob@example.com",
			role: "signer",
		},
	],
	emailSubject: "NDA",
	emailMessage: "Please sign",
	settlementDrafts: [],
	documents: [
		{
			id: "doc-1",
			name: "nda.pdf",
			size: 1000,
			type: "application/pdf",
		},
	],
	signatureFields: [
		{
			id: "field-1",
			type: "signature",
			x: 100,
			y: 200,
			width: 120,
			height: 40,
			page: 1,
			documentId: "doc-1",
			assignedSignerWallet: "",
			assignedSignerName: "Alice",
			assignedSignerEmail: "alice@example.com",
			required: true,
		},
		{
			id: "field-2",
			type: "signature",
			x: 100,
			y: 300,
			width: 120,
			height: 40,
			page: 1,
			documentId: "doc-1",
			assignedSignerWallet: "",
			assignedSignerName: "Bob",
			assignedSignerEmail: "bob@example.com",
			required: true,
		},
	],
	placementManifest: {
		version: 1,
		documents: [],
		fields: [],
	},
};

describe("draftSnapshotToTemplateSnapshot", () => {
	it("maps signer emails to stable role ids and preserves field geometry", () => {
		const snapshot = draftSnapshotToTemplateSnapshot(draftSnapshot);
		expect(snapshot.version).toBe(1);
		expect(snapshot.roles).toHaveLength(2);
		expect(snapshot.roles[0]?.kind).toBe("signer");
		expect(snapshot.roles[0]?.label).toBe("Signer 1");
		expect(snapshot.fields).toHaveLength(2);
		expect(snapshot.fields[0]?.roleId).toBe(snapshot.roles[0]?.roleId);
		expect(snapshot.fields[0]?.documentId).toBe("doc-1");
		expect(snapshot.fields[0]?.pageIndex).toBe(0);
		expect(snapshot.defaults?.emailSubject).toBe("NDA");
		expect(zTemplateSnapshot.parse(snapshot)).toEqual(snapshot);
	});
});

describe("applyRoleAssignments", () => {
	it("produces recipients and a valid placement manifest from role assignments", () => {
		const snapshot = draftSnapshotToTemplateSnapshot(draftSnapshot);
		const signerRole = snapshot.roles.find((r) => r.label === "Signer 1");
		const signerRole2 = snapshot.roles.find((r) => r.label === "Signer 2");
		if (!signerRole || !signerRole2) {
			throw new Error("expected signer roles");
		}

		const hydrated = applyRoleAssignments({
			snapshot,
			assignments: {
				[signerRole.roleId]: {
					name: "Alice Corp",
					email: "alice@corp.com",
				},
				[signerRole2.roleId]: {
					name: "Bob Corp",
					email: "bob@corp.com",
				},
			},
			documents: [
				{
					id: "doc-1",
					name: "nda.pdf",
					sha256Plaintext: `0x${"ab".repeat(32)}`,
					pageCount: 1,
				},
			],
		});

		expect(hydrated.recipients).toHaveLength(2);
		expect(hydrated.recipients[0]?.email).toBe("alice@corp.com");
		expect(hydrated.signatureFields).toHaveLength(2);
		expect(hydrated.signatureFields[0]?.assignedSignerEmail).toBe(
			"alice@corp.com",
		);
		expect(zPlacementManifest.parse(hydrated.placementManifest)).toEqual(
			hydrated.placementManifest,
		);
	});
});
