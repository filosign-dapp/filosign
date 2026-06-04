import { describe, expect, it } from "bun:test";
import {
	validateAttachmentPacketComposeDrafts,
	validateAttachmentPacketDraftsForSend,
} from "./validate-attachment-packets";

describe("validateAttachmentPacketDraftsForSend", () => {
	it("rejects packets when supplementary attachments are disabled", () => {
		const issues = validateAttachmentPacketDraftsForSend({
			supplementaryAttachments: false,
			recipientSelect: true,
			conditionalRelease: true,
			drafts: [
				{
					releaseMode: "review",
					recipientEmails: ["a@example.com"],
				},
			],
			rosterEmails: ["a@example.com"],
		});
		expect(issues.some((i) => i.code === "FEATURE_DISABLED")).toBe(true);
	});

	it("rejects off-roster recipient emails", () => {
		const issues = validateAttachmentPacketDraftsForSend({
			supplementaryAttachments: true,
			recipientSelect: true,
			conditionalRelease: true,
			drafts: [
				{
					releaseMode: "review",
					recipientEmails: ["other@example.com"],
				},
			],
			rosterEmails: ["a@example.com"],
		});
		expect(issues.some((i) => i.code === "OFF_ROSTER_RECIPIENT")).toBe(true);
	});

	it("requires all roster recipients when recipient select is disabled", () => {
		const issues = validateAttachmentPacketDraftsForSend({
			supplementaryAttachments: true,
			recipientSelect: false,
			conditionalRelease: true,
			drafts: [
				{
					releaseMode: "review",
					recipientEmails: ["a@example.com"],
				},
			],
			rosterEmails: ["a@example.com", "b@example.com"],
		});
		expect(issues.some((i) => i.code === "RECIPIENT_SELECT_DISABLED")).toBe(
			true,
		);
	});

	it("rejects conditional release when plan gate is off", () => {
		const issues = validateAttachmentPacketDraftsForSend({
			supplementaryAttachments: true,
			recipientSelect: true,
			conditionalRelease: false,
			drafts: [
				{
					releaseMode: "conditional",
					recipientEmails: ["a@example.com"],
				},
			],
			rosterEmails: ["a@example.com"],
		});
		expect(issues.some((i) => i.code === "CONDITIONAL_DISABLED")).toBe(true);
	});
});

describe("validateAttachmentPacketComposeDrafts", () => {
	it("rejects empty packets and oversized files", () => {
		const issues = validateAttachmentPacketComposeDrafts({
			drafts: [
				{ files: [], recipientEmails: ["a@example.com"] },
				{
					files: [
						{
							name: "big.pdf",
							bytes: new Uint8Array(6 * 1024 * 1024),
						},
					],
					recipientEmails: ["a@example.com"],
				},
			],
		});
		expect(issues.some((i) => i.code === "EMPTY_PACKET")).toBe(true);
		expect(issues.some((i) => i.code === "FILE_TOO_LARGE")).toBe(true);
	});
});
