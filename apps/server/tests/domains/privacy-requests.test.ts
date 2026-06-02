import { describe, expect, mock, test } from "bun:test";
import { getAddress } from "viem";

const updateReturningMock = mock(async () => [
	{
		id: "a2bc2f2d-5faa-4f55-aa01-30f5d4f9d2f1",
		type: "erasure",
		status: "completed",
		requestedAt: new Date(),
		dueAt: new Date(),
		completedAt: new Date(),
		closureNote: "done",
		legalHoldReason: null,
	},
]);
const ledgerInsertMock = mock(async () => ({}));

mock.module("@/lib/platform/db", () => ({
	default: {
		schema: {
			users: {},
			userHistory: {},
			userInvites: {},
			organizationInvites: {},
			envelopeDrafts: {},
			envelopeDraftDocuments: {},
			platformInviteRedemptions: {},
			analyticsConsentReceipts: {},
			fileParticipants: {},
			fileSignatures: {},
			fileAcknowledgements: {},
			complianceExportLogs: {},
			fileColdInvites: {},
			billingWebhookEvents: {},
			accessRequests: {},
			privacyRequests: {
				id: "id",
				type: "type",
				status: "status",
				requestedAt: "requestedAt",
				dueAt: "dueAt",
				completedAt: "completedAt",
				closureNote: "closureNote",
				legalHoldReason: "legalHoldReason",
				updatedAt: "updatedAt",
			},
			privacyErasureLedger: {
				subjectWalletAddress: "subjectWalletAddress",
				action: "action",
				executedAt: "executedAt",
				replayRequired: "replayRequired",
				contextJson: "contextJson",
			},
		},
		update: () => ({
			set: () => ({
				where: () => ({
					returning: updateReturningMock,
				}),
			}),
		}),
		insert: () => ({
			values: ledgerInsertMock,
		}),
	},
}));

describe("privacy request lifecycle", () => {
	test("completed erasure transition writes replay ledger", async () => {
		const wallet = getAddress("0x1111111111111111111111111111111111111111");
		const { userPrivacyRequestTransition } = await import(
			"@/api/handlers/users/profile"
		);
		const out = await userPrivacyRequestTransition(wallet, {
			requestId: "a2bc2f2d-5faa-4f55-aa01-30f5d4f9d2f1",
			status: "completed",
		});
		expect(out.type).toBe("erasure");
		expect(out.status).toBe("completed");
		expect(ledgerInsertMock).toHaveBeenCalledTimes(1);
	});
});
