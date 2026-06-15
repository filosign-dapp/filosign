import { describe, expect, test } from "bun:test";
import {
	addTemplateRole,
	countFieldsForDocument,
	countFieldsForRole,
	createTemplateRoleId,
	nextSignerLabel,
	removeTemplateDocument,
	removeTemplateRole,
	updateTemplateRole,
} from "../utils/template-editor";

const baseState = {
	recipients: [
		{
			clientRowId: "role_a",
			name: "Signer 1",
			email: "role_a@template.filosign",
			role: "signer" as const,
		},
	],
	signatureFields: [
		{
			id: "f1",
			type: "signature" as const,
			x: 10,
			y: 20,
			width: 120,
			height: 40,
			page: 1,
			documentId: "doc-1",
			assignedSignerWallet: "",
			assignedSignerName: "Signer 1",
			assignedSignerEmail: "role_a@template.filosign",
			required: true,
		},
	],
	documents: [
		{ id: "doc-1", name: "nda.pdf", size: 100, type: "application/pdf" },
	],
};

describe("template editor mutations", () => {
	test("createTemplateRoleId returns stable prefix", () => {
		expect(createTemplateRoleId()).toMatch(/^role_/);
	});

	test("nextSignerLabel increments", () => {
		expect(nextSignerLabel([])).toBe("Signer 1");
		expect(
			nextSignerLabel([
				{ roleId: "a", label: "Signer 1", kind: "signer", order: 0 },
			]),
		).toBe("Signer 2");
	});

	test("addTemplateRole appends signer with synthetic email", () => {
		const next = addTemplateRole({ state: baseState });
		expect(next.recipients).toHaveLength(2);
		expect(next.recipients[1]?.role).toBe("signer");
		expect(next.recipients[1]?.email).toMatch(/@template\.filosign$/);
	});

	test("updateTemplateRole renames label", () => {
		const next = updateTemplateRole({
			state: baseState,
			roleId: "role_a",
			label: "Buyer",
		});
		expect(next.recipients[0]?.name).toBe("Buyer");
	});

	test("updateTemplateRole to viewer removes fields", () => {
		const next = updateTemplateRole({
			state: baseState,
			roleId: "role_a",
			kind: "viewer",
		});
		expect(next.recipients[0]?.role).toBe("viewer");
		expect(next.signatureFields).toHaveLength(0);
	});

	test("removeTemplateRole drops role and fields", () => {
		const withTwo = addTemplateRole({ state: baseState });
		const roleId = withTwo.recipients[1]?.clientRowId;
		if (!roleId) throw new Error("missing role");
		const next = removeTemplateRole({ state: withTwo, roleId });
		expect(next.recipients).toHaveLength(1);
	});

	test("removeTemplateRole blocks removing last signer", () => {
		expect(() =>
			removeTemplateRole({ state: baseState, roleId: "role_a" }),
		).toThrow("At least one signer role is required.");
	});

	test("removeTemplateDocument cascades fields", () => {
		const next = removeTemplateDocument({
			state: baseState,
			documentId: "doc-1",
		});
		expect(next.documents).toHaveLength(0);
		expect(next.signatureFields).toHaveLength(0);
	});

	test("countFieldsForRole and countFieldsForDocument", () => {
		expect(countFieldsForRole({ state: baseState, roleId: "role_a" })).toBe(1);
		expect(
			countFieldsForDocument({ state: baseState, documentId: "doc-1" }),
		).toBe(1);
	});
});
