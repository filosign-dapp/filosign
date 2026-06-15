import { describe, expect, it } from "bun:test";
import {
	draftDekWrapOmkInfo,
	draftDocumentInfo,
	templateDekWrapOmkInfo,
	templateDocumentInfo,
} from "..";

describe("template crypto info strings", () => {
	it("uses dedicated template prefixes distinct from draft labels", () => {
		const templateId = "tmpl-1";
		const docId = "doc-1";
		const draftId = "draft-1";

		expect(templateDekWrapOmkInfo(templateId)).toBe(
			"filosign:template-dek-wrap:omk:v1:tmpl-1",
		);
		expect(templateDocumentInfo(templateId, docId)).toBe(
			"filosign:template-document:v1:tmpl-1:doc-1",
		);
		expect(templateDekWrapOmkInfo(templateId)).not.toBe(
			draftDekWrapOmkInfo(draftId),
		);
		expect(templateDocumentInfo(templateId, docId)).not.toBe(
			draftDocumentInfo(draftId, docId),
		);
	});
});
