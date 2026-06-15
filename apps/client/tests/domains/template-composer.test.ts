import { describe, expect, test } from "bun:test";
import {
	createTemplateRoleId,
	templateRolePlaceholderEmail,
} from "@filosign/shared";
import type { CreateForm } from "../../src/lib/domains/files/envelope-form-types";
import {
	applyTemplateEditorMutation,
	templateRolesFromCreateForm,
} from "../../src/lib/domains/templates/template-composer";

function baseCreateForm(roleId = "role_a"): CreateForm {
	return {
		draftId: "draft-1",
		recipients: [
			{
				clientRowId: roleId,
				name: "Signer 1",
				email: templateRolePlaceholderEmail(roleId),
				role: "signer",
			},
		],
		emailSubject: "NDA",
		emailMessage: "Please sign",
		documents: [
			{ id: "doc-1", name: "nda.pdf", size: 100, type: "application/pdf" },
		],
		settlementDrafts: [],
		signatureFields: [],
		recipientFingerprint: "fp",
	};
}

describe("template composer adapters", () => {
	test("templateRolesFromCreateForm maps recipients to role rows", () => {
		const roles = templateRolesFromCreateForm(baseCreateForm());
		expect(roles).toHaveLength(1);
		expect(roles[0]?.label).toBe("Signer 1");
		expect(roles[0]?.kind).toBe("signer");
	});

	test("applyTemplateEditorMutation addRole appends signer", () => {
		const next = applyTemplateEditorMutation(baseCreateForm(), {
			type: "addRole",
		});
		expect(next.recipients).toHaveLength(2);
		expect(next.recipients[1]?.role).toBe("signer");
	});

	test("applyTemplateEditorMutation updateRole renames label", () => {
		const next = applyTemplateEditorMutation(baseCreateForm(), {
			type: "updateRole",
			roleId: "role_a",
			label: "Buyer",
		});
		expect(next.recipients[0]?.name).toBe("Buyer");
	});

	test("applyTemplateEditorMutation removeDocument drops doc rows", () => {
		const next = applyTemplateEditorMutation(baseCreateForm(), {
			type: "removeDocument",
			documentId: "doc-1",
		});
		expect(next.documents).toHaveLength(0);
	});

	test("applyTemplateEditorMutation uses stable role ids from shared helper", () => {
		const roleId = createTemplateRoleId();
		const seeded = {
			...baseCreateForm(roleId),
			recipients: baseCreateForm(roleId).recipients,
		};
		const next = applyTemplateEditorMutation(seeded, { type: "addRole" });
		expect(next.recipients[1]?.clientRowId).toMatch(/^role_/);
	});
});
