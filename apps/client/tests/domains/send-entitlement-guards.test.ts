import "../support/env-stub";
import { describe, expect, test } from "bun:test";
import type { EntitlementsSnapshot } from "@filosign/react/billing";
import { getAddress } from "viem";
import { PLAN_LIMIT_COPY } from "../../src/lib/domains/entitlements/plan-limit-copy";
import {
	validateAttachmentPacketsForSend,
	validateSettlementDraftsForSend,
	validateTreasuryPayerForSend,
} from "../../src/routes/dashboard/envelope/create/add-sign/-lib/utils/send/entitlement-guards";

function entitlements(
	features: Partial<Record<string, boolean>>,
): EntitlementsSnapshot {
	return {
		planId: "free",
		features: Object.fromEntries(
			Object.entries(features).map(([key, enabled]) => [
				key,
				{ enabled: enabled ?? false },
			]),
		),
	} as unknown as EntitlementsSnapshot;
}

describe("send entitlement guards", () => {
	describe("validateSettlementDraftsForSend", () => {
		test("returns null when there are no settlement drafts", () => {
			expect(
				validateSettlementDraftsForSend({
					entitlements: entitlements({}),
					settlementDrafts: [],
				}),
			).toBeNull();
		});

		test("returns plan-limit toast when drafts exist without entitlement", () => {
			const copy = PLAN_LIMIT_COPY["features.settlement.basic"];
			expect(
				validateSettlementDraftsForSend({
					entitlements: entitlements({
						"features.settlement.basic": false,
					}),
					settlementDrafts: [{ id: "leg-1" } as never],
				}),
			).toEqual({
				kind: "toast",
				title: copy.title,
				hint: copy.description,
			});
		});

		test("blocks quorum_required payout when threshold mismatches envelope minimum", () => {
			const failure = validateSettlementDraftsForSend({
				entitlements: entitlements({
					"features.settlement.basic": true,
				}),
				settlementDrafts: [
					{
						id: "leg-1",
						releaseType: "quorum_required",
						thresholdN: 2,
					} as never,
				],
				recipients: [
					{ email: "a@example.com", role: "signer" },
					{ email: "b@example.com", role: "signer" },
					{ email: "c@example.com", role: "signer" },
					{ email: "d@example.com", role: "signer" },
				],
				registerRouting: { quorumN: 3 },
			});
			expect(failure?.kind).toBe("toast");
			expect(failure?.kind === "toast" ? failure.title : "").toBe(
				"Check payout release conditions",
			);
		});
	});

	describe("validateAttachmentPacketsForSend", () => {
		test("returns null when there are no attachment drafts", () => {
			expect(
				validateAttachmentPacketsForSend({
					entitlements: entitlements({}),
					attachmentComposeDrafts: [],
					rosterEmails: ["signer@example.com"],
				}),
			).toBeNull();
		});

		test("returns plan-limit toast when drafts exist without supplementary entitlement", () => {
			const copy = PLAN_LIMIT_COPY["features.supplementary_attachments"];
			expect(
				validateAttachmentPacketsForSend({
					entitlements: entitlements({
						"features.supplementary_attachments": false,
					}),
					attachmentComposeDrafts: [
						{
							packetId: "pkt-1",
							releaseMode: "review",
							recipientEmails: ["signer@example.com"],
						} as never,
					],
					rosterEmails: ["signer@example.com"],
				}),
			).toEqual({
				kind: "toast",
				title: copy.title,
				hint: copy.description,
			});
		});

		test("blocks conditional attachment when quorum threshold mismatches routing", () => {
			const failure = validateAttachmentPacketsForSend({
				entitlements: entitlements({
					"features.supplementary_attachments": true,
					"features.supplementary_attachments.recipient_select": true,
					"features.supplementary_attachments.conditional_release": true,
				}),
				attachmentComposeDrafts: [
					{
						packetId: "pkt-1",
						releaseMode: "conditional",
						releaseType: "quorum_required",
						thresholdN: 2,
						recipientEmails: ["signer@example.com"],
						files: [
							{
								id: "f1",
								name: "doc.pdf",
								mimeType: "application/pdf",
								bytes: new Uint8Array([1]),
							},
						],
					},
				],
				rosterEmails: ["signer@example.com"],
				recipients: [
					{ email: "a@example.com", role: "signer" },
					{ email: "b@example.com", role: "signer" },
					{ email: "c@example.com", role: "signer" },
					{ email: "d@example.com", role: "signer" },
				],
				registerRouting: { quorumN: 3 },
			});
			expect(failure?.kind).toBe("toast");
			expect(failure?.kind === "toast" ? failure.title : "").toBe(
				"Check file unlock conditions",
			);
		});
	});

	describe("validateTreasuryPayerForSend", () => {
		const orgWallet = getAddress("0x1111111111111111111111111111111111111111");
		const connectedWallet = getAddress(
			"0x2222222222222222222222222222222222222222",
		);

		test("blocks org wallet payer without Teams Pro treasury entitlement", () => {
			const failure = validateTreasuryPayerForSend({
				payoutPayerSource: "org_wallet",
				orgWalletAddress: orgWallet,
				connectedWalletAddress: connectedWallet,
				registerSettlementRules: async () => [],
				hasSettlementDrafts: true,
				entitlements: entitlements({
					"features.treasury.workspace_custom": false,
				}),
			});

			expect(failure?.kind).toBe("toast");
			expect(failure?.kind === "toast" ? failure.title : "").toContain(
				"Teams Pro",
			);
		});

		test("allows org wallet payer when treasury entitlement is enabled", () => {
			const failure = validateTreasuryPayerForSend({
				payoutPayerSource: "org_wallet",
				orgWalletAddress: orgWallet,
				connectedWalletAddress: connectedWallet,
				registerSettlementRules: async () => [],
				hasSettlementDrafts: true,
				entitlements: entitlements({
					"features.treasury.workspace_custom": true,
				}),
			});

			expect(failure).toBeNull();
		});
	});
});
