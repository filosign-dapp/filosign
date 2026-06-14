import { describe, expect, it, mock } from "bun:test";
import type { EntitlementsSnapshot } from "@filosign/react/billing";
import { PLAN_LIMIT_COPY } from "../../src/lib/domains/entitlements/plan-limit-copy";

mock.module("@filosign/react/files", () => ({
	canUseBasicSettlements: (entitlements: EntitlementsSnapshot | undefined) =>
		entitlements?.features?.["features.settlement.basic"]?.enabled === true,
	canUseSupplementaryAttachments: (
		entitlements: EntitlementsSnapshot | undefined,
	) =>
		entitlements?.features?.["features.supplementary_attachments"]?.enabled ===
		true,
	canSelectSupplementaryRecipients: () => true,
	canUseConditionalAttachmentRelease: () => true,
}));

const { validateAttachmentPacketsForSend, validateSettlementDraftsForSend } =
	await import(
		"../../src/routes/dashboard/envelope/create/add-sign/-lib/utils/send/entitlement-guards"
	);

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

describe("validateSettlementDraftsForSend", () => {
	it("returns null when there are no settlement drafts", () => {
		expect(
			validateSettlementDraftsForSend({
				entitlements: entitlements({}),
				settlementDrafts: [],
			}),
		).toBeNull();
	});

	it("returns plan-limit toast when drafts exist without entitlement", () => {
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
});

describe("validateAttachmentPacketsForSend", () => {
	it("returns null when there are no attachment drafts", () => {
		expect(
			validateAttachmentPacketsForSend({
				entitlements: entitlements({}),
				attachmentComposeDrafts: [],
				rosterEmails: ["signer@example.com"],
			}),
		).toBeNull();
	});

	it("returns plan-limit toast when drafts exist without supplementary entitlement", () => {
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
});
