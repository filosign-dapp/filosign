import { describe, expect, it } from "bun:test";
import {
	applyRoleAssignments,
	type DraftSnapshot,
	draftSnapshotToTemplateSnapshot,
	parseRoleIdFromPlaceholderEmail,
	templateRolePlaceholderEmail,
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

	it("preserves role ids across editor roundtrip without prefix explosion", () => {
		const initial = draftSnapshotToTemplateSnapshot(draftSnapshot);
		let snapshot = initial;

		for (let i = 0; i < 3; i++) {
			const editorRecipients = snapshot.roles.map((role) => ({
				clientRowId: role.roleId,
				name: role.label,
				email: templateRolePlaceholderEmail(role.roleId),
				role: role.kind,
			}));
			const roleEmailById = new Map(
				snapshot.roles.map((role) => [
					role.roleId,
					templateRolePlaceholderEmail(role.roleId),
				]),
			);
			const editorFields = snapshot.fields.map((field) => ({
				id: field.id,
				type: field.type,
				x: field.rect.x * 612,
				y: field.rect.y * 792,
				width: field.rect.width * 612,
				height: field.rect.height * 792,
				page: field.pageIndex + 1,
				documentId: field.documentId,
				assignedSignerWallet: "",
				assignedSignerName:
					snapshot.roles.find((r) => r.roleId === field.roleId)?.label ??
					"Signer",
				assignedSignerEmail:
					roleEmailById.get(field.roleId) ??
					templateRolePlaceholderEmail(field.roleId),
				required: field.required,
			}));

			snapshot = draftSnapshotToTemplateSnapshot({
				...draftSnapshot,
				recipients: editorRecipients,
				signatureFields: editorFields,
			});
		}

		expect(snapshot.roles.map((r) => r.roleId)).toEqual(
			initial.roles.map((r) => r.roleId),
		);
		expect(snapshot.fields.map((f) => f.roleId)).toEqual(
			initial.fields.map((f) => f.roleId),
		);
	});

	it("preserves custom role labels from template editor recipients on save", () => {
		const roleId = "role_custom";
		const snapshot = draftSnapshotToTemplateSnapshot({
			...draftSnapshot,
			recipients: [
				{
					clientRowId: roleId,
					name: "Buyer",
					email: templateRolePlaceholderEmail(roleId),
					role: "signer",
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
					assignedSignerName: "Buyer",
					assignedSignerEmail: templateRolePlaceholderEmail(roleId),
					required: true,
				},
			],
		});

		expect(snapshot.roles).toHaveLength(1);
		expect(snapshot.roles[0]?.label).toBe("Buyer");
	});

	it("parseRoleIdFromPlaceholderEmail preserves role ids with embedded @", () => {
		const roleId = "signer:alice@example.com";
		const placeholder = templateRolePlaceholderEmail(roleId);
		expect(placeholder).toBe("signer:alice@example.com@template.filosign");
		expect(parseRoleIdFromPlaceholderEmail(placeholder)).toBe(roleId);
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
