import { describe, expect, it } from "bun:test";
import { resolveComposeAdvanceUpgrade } from "../../src/routes/dashboard/envelope/create/-lib/utils/compose-advance-guards";

describe("resolveComposeAdvanceUpgrade", () => {
	const allowed = {
		monthlyQuotaExhausted: false,
		withinRecipientLimit: true,
		settlementsAllowed: true,
		supplementaryAttachmentsAllowed: true,
		advancedRoutingAllowed: true,
		workspaceTreasuryAllowed: true,
		treasuryPayerOffered: true,
	};

	it("returns null when all gates pass", () => {
		expect(
			resolveComposeAdvanceUpgrade({
				...allowed,
				recipientCount: 2,
				settlementDraftCount: 1,
				persistedAttachmentDraftCount: 1,
			}),
		).toBeNull();
	});

	it("blocks when monthly quota is exhausted", () => {
		expect(
			resolveComposeAdvanceUpgrade({
				...allowed,
				monthlyQuotaExhausted: true,
				recipientCount: 1,
				settlementDraftCount: 0,
				persistedAttachmentDraftCount: 0,
			}),
		).toBe("documents.sent.monthly");
	});

	it("blocks when recipient limit is exceeded", () => {
		expect(
			resolveComposeAdvanceUpgrade({
				...allowed,
				withinRecipientLimit: false,
				recipientCount: 10,
				settlementDraftCount: 0,
				persistedAttachmentDraftCount: 0,
			}),
		).toBe("envelope.recipients.max");
	});

	it("blocks stale settlement drafts without basic settlements", () => {
		expect(
			resolveComposeAdvanceUpgrade({
				...allowed,
				settlementsAllowed: false,
				recipientCount: 1,
				settlementDraftCount: 2,
				persistedAttachmentDraftCount: 0,
			}),
		).toBe("features.settlement.basic");
	});

	it("blocks stale attachment drafts without supplementary entitlement", () => {
		expect(
			resolveComposeAdvanceUpgrade({
				...allowed,
				supplementaryAttachmentsAllowed: false,
				recipientCount: 1,
				settlementDraftCount: 0,
				persistedAttachmentDraftCount: 1,
			}),
		).toBe("features.supplementary_attachments");
	});

	it("ignores empty stale draft lists", () => {
		expect(
			resolveComposeAdvanceUpgrade({
				...allowed,
				settlementsAllowed: false,
				supplementaryAttachmentsAllowed: false,
				recipientCount: 1,
				settlementDraftCount: 0,
				persistedAttachmentDraftCount: 0,
			}),
		).toBeNull();
	});

	it("blocks stale quorum routing without advanced routing entitlement", () => {
		expect(
			resolveComposeAdvanceUpgrade({
				...allowed,
				advancedRoutingAllowed: false,
				recipientCount: 2,
				settlementDraftCount: 0,
				persistedAttachmentDraftCount: 0,
				quorumN: 2,
			}),
		).toBe("features.routing.advanced");
	});

	it("blocks stale ordered signing without advanced routing entitlement", () => {
		expect(
			resolveComposeAdvanceUpgrade({
				...allowed,
				advancedRoutingAllowed: false,
				recipientCount: 2,
				settlementDraftCount: 0,
				persistedAttachmentDraftCount: 0,
				turnOrderEnabled: true,
			}),
		).toBe("features.routing.advanced");
	});

	it("blocks stale treasury payer without workspace treasury entitlement", () => {
		expect(
			resolveComposeAdvanceUpgrade({
				...allowed,
				workspaceTreasuryAllowed: false,
				treasuryPayerOffered: false,
				recipientCount: 1,
				settlementDraftCount: 0,
				persistedAttachmentDraftCount: 0,
				payoutPayerSource: "org_wallet",
			}),
		).toBe("features.treasury.workspace_custom");
	});

	it("blocks org_wallet payer when treasury cannot be offered", () => {
		expect(
			resolveComposeAdvanceUpgrade({
				...allowed,
				workspaceTreasuryAllowed: true,
				treasuryPayerOffered: false,
				recipientCount: 1,
				settlementDraftCount: 0,
				persistedAttachmentDraftCount: 0,
				payoutPayerSource: "org_wallet",
			}),
		).toBe("features.treasury.workspace_custom");
	});
});
