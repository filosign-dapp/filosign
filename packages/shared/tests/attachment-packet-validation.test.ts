import { describe, expect, test } from "bun:test";
import {
	validateAttachmentPacketDraftsForSend,
	validateAttachmentPacketsForSend,
} from "../utils/attachment-packet-validation";

describe("validateAttachmentPacketsForSend", () => {
	const rosterEmails = ["sender@example.com", "signer@example.com"];

	test("rejects off-roster recipient", () => {
		const issues = validateAttachmentPacketsForSend({
			supplementaryAttachments: true,
			recipientSelect: true,
			conditionalRelease: false,
			rosterEmails,
			packets: [
				{
					packetId: "p1",
					releaseMode: "review",
					recipientEmails: ["outsider@example.com"],
					packetCid: "0".repeat(64),
				},
			],
		});
		expect(issues.some((i) => i.code === "OFF_ROSTER_RECIPIENT")).toBe(true);
	});

	test("rejects partial roster when recipient_select is disabled", () => {
		const issues = validateAttachmentPacketsForSend({
			supplementaryAttachments: true,
			recipientSelect: false,
			conditionalRelease: false,
			rosterEmails,
			packets: [
				{
					packetId: "p1",
					releaseMode: "review",
					recipientEmails: ["sender@example.com"],
					packetCid: "0".repeat(64),
				},
			],
		});
		expect(issues.some((i) => i.code === "RECIPIENT_SELECT_DISABLED")).toBe(
			true,
		);
	});

	test("allows partial roster when recipient_select is enabled", () => {
		const issues = validateAttachmentPacketsForSend({
			supplementaryAttachments: true,
			recipientSelect: true,
			conditionalRelease: false,
			rosterEmails,
			packets: [
				{
					packetId: "p1",
					releaseMode: "review",
					recipientEmails: ["sender@example.com"],
					packetCid: "0".repeat(64),
				},
			],
		});
		expect(issues).toHaveLength(0);
	});
});

describe("validateAttachmentPacketDraftsForSend", () => {
	test("maps drafts into packet validation", () => {
		const issues = validateAttachmentPacketDraftsForSend({
			supplementaryAttachments: true,
			recipientSelect: false,
			conditionalRelease: false,
			rosterEmails: ["a@example.com", "b@example.com"],
			drafts: [
				{
					releaseMode: "review",
					recipientEmails: ["a@example.com"],
				},
			],
		});
		expect(issues.some((i) => i.code === "RECIPIENT_SELECT_DISABLED")).toBe(
			true,
		);
	});
});
