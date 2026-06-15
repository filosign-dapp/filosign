import "../support/mock-indexeddb";
import { describe, expect, test } from "bun:test";
import {
	createTemplateRoleId,
	templateRolePlaceholderEmail,
} from "@filosign/shared";
import type { CreateForm } from "@/src/lib/domains/files/envelope-form-types";
import {
	buildTemplateSnapshotFromComposer,
	finalizeTemplateUseAtComposeContinue,
	hydrateCreateFormFromTemplateForCompose,
} from "@/src/lib/domains/templates/template-composer";
import { missingTemplateSignerFieldRoleLabel } from "@/src/lib/domains/templates/utils/validate-save";

const roleA = createTemplateRoleId();
const roleB = createTemplateRoleId();

function buildSnapshot() {
	return buildTemplateSnapshotFromComposer({
		recipients: [
			{
				clientRowId: roleA,
				name: "",
				email: templateRolePlaceholderEmail(roleA),
				role: "signer",
			},
			{
				clientRowId: roleB,
				name: "",
				email: templateRolePlaceholderEmail(roleB),
				role: "signer",
			},
		],
		signatureFields: [
			{
				id: "field-a",
				type: "signature",
				x: 10,
				y: 20,
				width: 120,
				height: 40,
				page: 1,
				documentId: "doc-1",
				assignedSignerWallet: "",
				assignedSignerName: "Signer 1",
				assignedSignerEmail: templateRolePlaceholderEmail(roleA),
				required: true,
			},
			{
				id: "field-b",
				type: "initial",
				x: 40,
				y: 60,
				width: 120,
				height: 40,
				page: 1,
				documentId: "doc-1",
				assignedSignerWallet: "",
				assignedSignerName: "Signer 2",
				assignedSignerEmail: templateRolePlaceholderEmail(roleB),
				required: true,
			},
		],
		emailSubject: "NDA",
		emailMessage: "Please sign",
		documents: [
			{ id: "doc-1", name: "nda.pdf", size: 100, type: "application/pdf" },
		],
	});
}

describe("hydrateCreateFormFromTemplateForCompose", () => {
	test("hydrates placeholder roles with empty names and templateUse metadata", async () => {
		const snapshot = buildSnapshot();
		const bytes = new Uint8Array([1, 2, 3]);
		const draft = await hydrateCreateFormFromTemplateForCompose({
			templateId: "template-1",
			snapshot,
			documents: [
				{
					id: "doc-1",
					name: "nda.pdf",
					type: "application/pdf",
					bytes,
				},
			],
		});

		expect(draft.templateUse?.templateId).toBe("template-1");
		expect(draft.recipients).toHaveLength(2);
		expect(draft.recipients[0]?.name).toBe("");
		expect(draft.recipients[0]?.templateRoleLabel).toBe("Signer 1");
		expect(draft.signatureFields).toHaveLength(2);
	});
});

describe("finalizeTemplateUseAtComposeContinue", () => {
	test("remaps template fields to compose recipient emails", async () => {
		const snapshot = buildSnapshot();
		const bytes = new Uint8Array([1, 2, 3]);
		const hydrated = await hydrateCreateFormFromTemplateForCompose({
			templateId: "template-1",
			snapshot,
			documents: [
				{
					id: "doc-1",
					name: "nda.pdf",
					type: "application/pdf",
					bytes,
				},
			],
		});

		const finalized = await finalizeTemplateUseAtComposeContinue({
			prev: hydrated,
			formRecipients: [
				{
					clientRowId: roleA,
					name: "Alice",
					email: "alice@corp.com",
					role: "signer",
					templateRoleLabel: "Signer 1",
				},
				{
					clientRowId: roleB,
					name: "Bob",
					email: "bob@corp.com",
					role: "signer",
					templateRoleLabel: "Signer 2",
				},
			],
			emailSubject: "NDA",
			emailMessage: "Please sign",
			settlementDrafts: [],
		});

		expect(finalized.templateUse).toBeUndefined();
		expect(finalized.signatureFields).toHaveLength(2);
		expect(finalized.signatureFields[0]?.assignedSignerEmail).toBe(
			"alice@corp.com",
		);
		expect(finalized.signatureFields[1]?.assignedSignerEmail).toBe(
			"bob@corp.com",
		);
	});

	test("drops fields for removed template roles", async () => {
		const snapshot = buildSnapshot();
		const bytes = new Uint8Array([1, 2, 3]);
		const hydrated = await hydrateCreateFormFromTemplateForCompose({
			templateId: "template-1",
			snapshot,
			documents: [
				{
					id: "doc-1",
					name: "nda.pdf",
					type: "application/pdf",
					bytes,
				},
			],
		});

		const finalized = await finalizeTemplateUseAtComposeContinue({
			prev: hydrated,
			formRecipients: [
				{
					clientRowId: roleA,
					name: "Alice",
					email: "alice@corp.com",
					role: "signer",
					templateRoleLabel: "Signer 1",
				},
			],
			emailSubject: "NDA",
			emailMessage: "",
			settlementDrafts: [],
		});

		expect(finalized.signatureFields).toHaveLength(1);
		expect(finalized.recipients).toHaveLength(1);
	});
});

describe("missingTemplateSignerFieldRoleLabel", () => {
	test("returns role label when signer has no signature or initial field", () => {
		const createForm = {
			draftId: "draft-1",
			recipientFingerprint: "fp",
			recipients: [
				{
					clientRowId: roleA,
					name: "",
					email: templateRolePlaceholderEmail(roleA),
					role: "signer" as const,
					templateRoleLabel: "Signer 1",
				},
			],
			emailSubject: "Test",
			emailMessage: "",
			documents: [
				{ id: "doc-1", name: "nda.pdf", size: 1, type: "application/pdf" },
			],
			settlementDrafts: [],
			signatureFields: [],
		} satisfies CreateForm;

		expect(missingTemplateSignerFieldRoleLabel(createForm)).toBe("Signer 1");
	});
});
