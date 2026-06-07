import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import type { ComplianceBundle } from "@filosign/shared";
import {
	canonicalComplianceBundleJson,
	zComplianceBundle,
} from "@filosign/shared";
import { getAddress } from "viem";
import {
	assertExportDocumentSha256Matches,
	ExportDocumentSha256MismatchError,
	isComplianceExportAllowed,
} from "@/lib/domains/files/utils/compliance-export";
import { sha256HexUtf8 } from "@/lib/platform/compliance/hash";

describe("compliance", () => {
	describe("compliance-export", () => {
		describe("isComplianceExportAllowed", () => {
			test("allows when fully executed", () => {
				expect(
					isComplianceExportAllowed({
						completedAt: new Date(),
						revokedBeforeCompletedAt: null,
					}),
				).toBe(true);
			});

			test("allows when voided before complete", () => {
				expect(
					isComplianceExportAllowed({
						completedAt: null,
						revokedBeforeCompletedAt: new Date(),
					}),
				).toBe(true);
			});

			test("denies in-flight envelope", () => {
				expect(
					isComplianceExportAllowed({
						completedAt: null,
						revokedBeforeCompletedAt: null,
					}),
				).toBe(false);
			});
		});

		describe("assertExportDocumentSha256Matches", () => {
			const registered =
				"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

			test("allows omitted client root", () => {
				expect(() =>
					assertExportDocumentSha256Matches({
						provided: undefined,
						registered,
					}),
				).not.toThrow();
			});

			test("allows matching root (case-insensitive)", () => {
				expect(() =>
					assertExportDocumentSha256Matches({
						provided: registered.toUpperCase(),
						registered,
					}),
				).not.toThrow();
			});

			test("rejects mismatch", () => {
				expect(() =>
					assertExportDocumentSha256Matches({
						provided:
							"0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
						registered,
					}),
				).toThrow(ExportDocumentSha256MismatchError);
			});
		});
	});

	describe("compliance-export-pipeline", () => {
		const bundleFixture = zComplianceBundle.parse({
			version: 1,
			pieceCid: "bafyPIPELINE",
			chainId: 84532,
			exportedAtIso: "2026-01-01T00:00:00.000Z",
			executionStatus: "fully_executed",
			placementCommitment: `0x${"01".repeat(32)}`,
			placementManifest: {
				version: 1,
				documents: [
					{
						id: "doc1",
						name: "contract.pdf",
						sha256Plaintext: `0x${"ab".repeat(32)}`,
						pageCount: 1,
					},
				],
				fields: [
					{
						id: "f1",
						documentId: "doc1",
						pageIndex: 0,
						rect: { x: 0, y: 0, width: 0.1, height: 0.1 },
						assignedRecipientEmail: "signer@example.com",
						required: true,
						type: "signature",
					},
				],
			},
			registration: {
				sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
				registrationTxHash: `0x${"02".repeat(32)}`,
				createdAtIso: "2026-01-01T00:00:00.000Z",
				registerDocumentSha256: `0x${"12".repeat(32)}`,
			},
			parties: [
				{
					role: "sender",
					wallet: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
					email: "sender@example.com",
					displayName: "Sender",
					emailCommitment: `0x${"03".repeat(32)}`,
					authSubjectCommitment: `0x${"04".repeat(32)}`,
				},
			],
			onchainRegistration: null,
			transactions: [
				{
					kind: "file_registered",
					txHash: `0x${"02".repeat(32)}`,
					chainId: 84532,
					contractAddress: "0x0000000000000000000000000000000000000abc",
					summary: "test",
					relatedAddresses: ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"],
					blockNumber: null,
					timestamp: null,
					fetchedAtIso: null,
				},
			],
			signers: [
				{
					wallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
					displayName: "Signer",
					email: "signer@example.com",
					signed: true,
					assignedFieldIds: ["f1"],
					requiredFieldIds: ["f1"],
					optionalFieldIds: [],
					onchainTxHash: `0x${"05".repeat(32)}`,
					signedAtIso: "2026-01-01T00:00:00.000Z",
					messageTimestampIso: "2026-01-01T00:00:00.000Z",
					blockTimestampFromTx: null,
					acknowledgedAtIso: "2026-01-01T00:00:00.000Z",
					firstViewedAtIso: "2026-01-01T00:00:01.000Z",
					completedFieldIds: ["f1"],
					completionsRoot: `0x${"06".repeat(32)}`,
					leafSchemaVersion: 1,
					merkleProofs: [
						{
							fieldId: "f1",
							leafHash: `0x${"07".repeat(32)}`,
							leafIndex: 0,
							siblings: [],
						},
					],
					draftCompletedFieldIds: [],
				},
			],
			settlements: [],
			attachments: [],
			offChainEvidence: {
				acknowledgements: [],
				documentViews: [],
				coldInviteClaims: [],
				payoutRecipientAcknowledgements: [],
			},
		}) as ComplianceBundle;

		const bundleHash = sha256HexUtf8(
			canonicalComplianceBundleJson(bundleFixture),
		);

		let writtenKey: string | null = null;

		beforeAll(() => {
			mock.module("@/lib/platform/s3/client", () => ({
				bucket: {
					write: async (key: string) => {
						writtenKey = key;
					},
				},
			}));

			mock.module("@/lib/platform/db", () => ({
				default: {
					insert: () => ({
						values: () => ({
							returning: () => Promise.resolve([{ id: "export-id-1" }]),
						}),
					}),
				},
			}));
		});

		afterAll(() => {
			mock.restore();
		});

		describe("insertComplianceExportLog", () => {
			test("rejects bundle hash mismatch before writing", async () => {
				const { insertComplianceExportLog } = await import(
					"@/lib/platform/compliance/export-log"
				);
				const db = (await import("@/lib/platform/db")).default;
				writtenKey = null;

				await expect(
					insertComplianceExportLog({
						db,
						pieceCid: bundleFixture.pieceCid,
						requestedBy: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
						bundle: bundleFixture,
						bundleHash: `0x${"ff".repeat(32)}`,
						exportKind: "pdf",
					}),
				).rejects.toThrow(/hash mismatch/);

				expect(writtenKey).toBeNull();
			});

			test("persists when bundle hash matches canonical JSON", async () => {
				const { insertComplianceExportLog } = await import(
					"@/lib/platform/compliance/export-log"
				);
				const db = (await import("@/lib/platform/db")).default;
				writtenKey = null;

				const result = await insertComplianceExportLog({
					db,
					pieceCid: bundleFixture.pieceCid,
					requestedBy: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
					bundle: bundleFixture,
					bundleHash,
					exportKind: "zip",
					documentSha256: bundleFixture.registration.registerDocumentSha256,
				});

				expect(result.exportId).toBe("export-id-1");
				expect(writtenKey).toMatch(/^compliance-exports\//);
			});
		});
	});

	describe("privacy-requests", () => {
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

		beforeAll(() => {
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
		});

		afterAll(() => {
			mock.restore();
		});

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
	});
});
