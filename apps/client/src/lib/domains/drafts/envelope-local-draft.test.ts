import { describe, expect, it } from "bun:test";
import {
	stripCreateFormForPersist,
	withComposeOnlyFieldsFromPrev,
} from "@/src/lib/domains/drafts/envelope-local-draft";
import type { AttachmentPacketComposeDraft } from "@/src/lib/domains/files/attachment-packet-compose";
import type { CreateForm } from "@/src/lib/domains/files/envelope-form-types";

const baseForm: CreateForm = {
	draftId: "draft-123",
	recipientFingerprint: "fp",
	recipients: [],
	emailSubject: "",
	emailMessage: "",
	documents: [],
	settlementDrafts: [],
	signatureFields: [],
};

const attachmentPacketDraft: AttachmentPacketComposeDraft = {
	packetId: "packet-1",
	releaseMode: "review",
	releaseType: "all_required_signed",
	recipientEmails: ["a@example.com"],
	files: [
		{
			id: "file-1",
			name: "exhibit.pdf",
			mimeType: "application/pdf",
			bytes: new Uint8Array([1, 2, 3]),
		},
	],
};

describe("withComposeOnlyFieldsFromPrev", () => {
	it("preserves compose-only fields from prev on persist merge", () => {
		const prev: CreateForm = {
			...baseForm,
			registerRouting: {
				routingMode: 1,
				routingOrderEmails: ["a@example.com"],
				quorumN: 2,
			},
			combineSettlementLegs: true,
			attachmentPacketDrafts: [attachmentPacketDraft],
		};

		const next = withComposeOnlyFieldsFromPrev(
			{
				...baseForm,
				recipients: [
					{
						name: "Alice",
						email: "a@example.com",
						role: "signer",
					},
				],
			},
			prev,
		);

		expect(next.registerRouting).toEqual(prev.registerRouting);
		expect(next.combineSettlementLegs).toBe(true);
		expect(next.attachmentPacketDrafts).toEqual([attachmentPacketDraft]);
	});

	it("leaves compose-only fields undefined when prev is null", () => {
		const next = withComposeOnlyFieldsFromPrev(baseForm, null);
		expect(next.registerRouting).toBeUndefined();
		expect(next.combineSettlementLegs).toBeUndefined();
		expect(next.attachmentPacketDrafts).toBeUndefined();
	});
});

describe("stripCreateFormForPersist", () => {
	it("omits supplementary file bytes from persisted createForm", () => {
		const form: CreateForm = {
			...baseForm,
			attachmentPacketDrafts: [attachmentPacketDraft],
		};
		const stripped = stripCreateFormForPersist(form);
		const file = stripped?.attachmentPacketDrafts?.[0]?.files[0] as
			| { id: string; size?: number }
			| undefined;
		expect(file).toBeDefined();
		expect(file?.size).toBe(3);
	});
});
