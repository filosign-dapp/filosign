import { describe, expect, it } from "bun:test";
import { templateRolePlaceholderEmail } from "@filosign/shared";
import {
	fieldSignerAriaSnippet,
	signerDisplayName,
} from "@/src/lib/domains/files/placement-field-display";

describe("signerDisplayName", () => {
	it("prefers assigned signer name over template placeholder email", () => {
		const roleId = "role_cb4a0eef-5b92-4905-bd25-dd0853f8c5fd";
		expect(
			signerDisplayName({
				assignedSignerName: "Signer 1",
				assignedSignerEmail: templateRolePlaceholderEmail(roleId),
			}),
		).toBe("Signer 1");
	});

	it("hides template placeholder email when name is missing", () => {
		const roleId = "role_cb4a0eef-5b92-4905-bd25-dd0853f8c5fd";
		expect(
			signerDisplayName({
				assignedSignerName: "",
				assignedSignerEmail: templateRolePlaceholderEmail(roleId),
			}),
		).toBe("Signer");
	});

	it("falls back to real recipient email when name is missing", () => {
		expect(
			signerDisplayName({
				assignedSignerName: "",
				assignedSignerEmail: "alice@example.com",
			}),
		).toBe("alice@example.com");
	});
});

describe("fieldSignerAriaSnippet", () => {
	it("omits template placeholder email from aria text", () => {
		const roleId = "role_a";
		expect(
			fieldSignerAriaSnippet({
				id: "f1",
				type: "signature",
				page: 1,
				documentId: "doc-1",
				x: 0,
				y: 0,
				width: 120,
				height: 40,
				assignedSignerWallet: "",
				assignedSignerName: "Signer 1",
				assignedSignerEmail: templateRolePlaceholderEmail(roleId),
				required: true,
			}),
		).toBe("Signer 1");
	});
});
