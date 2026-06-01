import { describe, expect, it } from "bun:test";
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";
import {
	fieldsWithUnknownSignerEmails,
	hasAutoAddedSelfRecipient,
	isSelfSignEnabled,
	removeAutoAddedSelfRecipients,
	resolveSelfSignerOnRoster,
	selfAssignedFieldIds,
	signerEmailsForPlacementManifest,
	signerEmailsFromRecipients,
	upsertAutoAddedSelfRecipient,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/placement-assignees";

const signerRecipient = (email: string, wallet?: string): Recipient => ({
	clientRowId: crypto.randomUUID(),
	role: "signer",
	email,
	name: email,
	walletAddress: wallet,
});

describe("placement-assignees", () => {
	it("resolveSelfSignerOnRoster matches profile email", () => {
		const match = resolveSelfSignerOnRoster(
			[signerRecipient("kartik100100@gmail.com")],
			{ email: "Kartik100100@gmail.com", walletAddress: "0xabc" },
		);
		expect(match?.email).toBe("kartik100100@gmail.com");
	});

	it("resolveSelfSignerOnRoster matches wallet when roster email differs", () => {
		const wallet = "0x1234567890123456789012345678901234567890";
		const match = resolveSelfSignerOnRoster(
			[signerRecipient("work@example.com", wallet)],
			{ email: "personal@example.com", walletAddress: wallet },
		);
		expect(match?.email).toBe("work@example.com");
	});

	it("resolveSelfSignerOnRoster returns null when self is not a signer", () => {
		const match = resolveSelfSignerOnRoster(
			[signerRecipient("other@example.com")],
			{ email: "kartik100100@gmail.com", walletAddress: "0xabc" },
		);
		expect(match).toBeNull();
	});

	it("signerEmailsForPlacementManifest uses roster signer emails", () => {
		const emails = signerEmailsForPlacementManifest({
			signerRecipients: [signerRecipient("a@example.com")],
			signatureFields: [
				{
					id: "f1",
					type: "signature",
					x: 0,
					y: 0,
					width: 10,
					height: 10,
					page: 1,
					documentId: "d1",
					assignedSignerEmail: "a@example.com",
					assignedSignerName: "A",
					assignedSignerWallet: "",
					required: true,
				},
			],
		});
		expect(emails).toEqual(["a@example.com"]);
	});

	it("fieldsWithUnknownSignerEmails finds self-only assignments", () => {
		const unknown = fieldsWithUnknownSignerEmails({
			signerRecipients: [signerRecipient("other@example.com")],
			signatureFields: [
				{
					id: "f1",
					type: "signature",
					x: 0,
					y: 0,
					width: 10,
					height: 10,
					page: 1,
					documentId: "d1",
					assignedSignerEmail: "kartik100100@gmail.com",
					assignedSignerName: "Me",
					assignedSignerWallet: "",
					required: true,
				},
			],
		});
		expect(unknown).toHaveLength(1);
	});

	it("signerEmailsFromRecipients dedupes normalized emails", () => {
		expect(
			signerEmailsFromRecipients([
				signerRecipient("A@example.com"),
				signerRecipient("a@example.com"),
			]),
		).toEqual(["a@example.com"]);
	});

	it("upsertAutoAddedSelfRecipient adds self signer row", () => {
		const next = upsertAutoAddedSelfRecipient([], {
			email: "me@example.com",
			walletAddress: "0x1234567890123456789012345678901234567890",
			firstName: "Kartik",
		});
		expect(next).toHaveLength(1);
		expect(next?.[0]?.isAutoAddedSelf).toBe(true);
		expect(next?.[0]?.email).toBe("me@example.com");
		expect(next?.[0]?.role).toBe("signer");
	});

	it("upsertAutoAddedSelfRecipient skips when self already on roster", () => {
		const recipients = [signerRecipient("me@example.com")];
		const next = upsertAutoAddedSelfRecipient(recipients, {
			email: "me@example.com",
		});
		expect(next).toEqual(recipients);
		expect(hasAutoAddedSelfRecipient(next)).toBe(false);
	});

	it("removeAutoAddedSelfRecipients preserves manual recipients", () => {
		const manual: Recipient = {
			...signerRecipient("me@example.com"),
			isAutoAddedSelf: false,
		};
		const auto: Recipient = {
			...signerRecipient("me@example.com"),
			isAutoAddedSelf: true,
		};
		expect(removeAutoAddedSelfRecipients([manual, auto])).toEqual([manual]);
	});

	it("isSelfSignEnabled reflects auto-added or manual self on roster", () => {
		expect(
			isSelfSignEnabled(
				[
					{
						...signerRecipient("me@example.com"),
						isAutoAddedSelf: true,
					},
				],
				{ email: "me@example.com" },
			),
		).toBe(true);
		expect(
			isSelfSignEnabled([signerRecipient("me@example.com")], {
				email: "me@example.com",
			}),
		).toBe(true);
		expect(isSelfSignEnabled([], { email: "me@example.com" })).toBe(false);
	});

	it("selfAssignedFieldIds returns field ids for self email", () => {
		const ids = selfAssignedFieldIds(
			[
				{
					id: "f-self",
					type: "signature",
					x: 0,
					y: 0,
					width: 10,
					height: 10,
					page: 1,
					documentId: "d1",
					assignedSignerEmail: "me@example.com",
					assignedSignerName: "Me",
					assignedSignerWallet: "",
					required: true,
				},
				{
					id: "f-other",
					type: "signature",
					x: 0,
					y: 0,
					width: 10,
					height: 10,
					page: 1,
					documentId: "d1",
					assignedSignerEmail: "other@example.com",
					assignedSignerName: "Other",
					assignedSignerWallet: "",
					required: true,
				},
			],
			"Me@example.com",
		);
		expect(ids).toEqual(["f-self"]);
	});
});
