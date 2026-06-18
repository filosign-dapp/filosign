import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { SETTLEMENT_FEATURE_TERMS_VERSION } from "@filosign/shared";
import { dbQueryResult } from "../support/db-query-result";

describe("access", () => {
	describe("settlement-access-admin", () => {
		const orgId = "00000000-0000-7000-8000-000000000099";
		const admin = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;

		let updateReturning: unknown[] = [];

		beforeAll(() => {
			mock.module("@/lib/platform/db", () => ({
				default: {
					schema: {
						organizationSettlementFeatureAccess: {},
						organizations: {},
					},
					select: () => ({
						from: () => ({
							where: () => ({
								limit: () =>
									dbQueryResult([
										{
											status: "pending",
											termsVersion: SETTLEMENT_FEATURE_TERMS_VERSION,
											acceptedAt: new Date("2026-05-01T00:00:00Z"),
											acceptedByWallet: admin,
											useCase: "Test use case for payouts",
											reviewedAt: null,
											reviewNote: null,
										},
									]),
							}),
						}),
					}),
					update: () => ({
						set: () => ({
							where: () => ({
								returning: () => Promise.resolve(updateReturning),
							}),
						}),
					}),
				},
			}));
		});

		afterAll(() => {
			mock.restore();
		});

		describe("settlement feature access admin", () => {
			test("approve returns NOT_FOUND when no request row updated", async () => {
				updateReturning = [];
				const { approveOrganizationSettlementFeatureAccess } = await import(
					"@/lib/domains/settlement-access/settlement-access"
				);

				await expect(
					approveOrganizationSettlementFeatureAccess({
						adminWallet: admin,
						organizationId: orgId,
					}),
				).rejects.toMatchObject({
					code: "NOT_FOUND",
				});
			});

			test("reject returns NOT_FOUND when no request row updated", async () => {
				updateReturning = [];
				const { rejectOrganizationSettlementFeatureAccess } = await import(
					"@/lib/domains/settlement-access/settlement-access"
				);

				await expect(
					rejectOrganizationSettlementFeatureAccess({
						adminWallet: admin,
						organizationId: orgId,
					}),
				).rejects.toMatchObject({
					code: "NOT_FOUND",
				});
			});
		});
	});

	describe("settlement-access-admin-bypass", () => {
		const orgId = "00000000-0000-7000-8000-000000000099";
		const adminWallet = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;

		beforeAll(() => {
			mock.module("@/lib/platform/admin", () => ({
				isPlatformAdminForWallet: async (wallet: string) =>
					wallet.toLowerCase() === adminWallet.toLowerCase(),
			}));
		});

		afterAll(() => {
			mock.restore();
		});

		describe("settlement feature access platform admin bypass", () => {
			test("get returns approved without querying org access row", async () => {
				const { getOrganizationSettlementFeatureAccess } = await import(
					"@/lib/domains/settlement-access/settlement-access"
				);

				const access = await getOrganizationSettlementFeatureAccess(orgId, {
					callerWallet: adminWallet,
				});

				expect(access).toEqual({
					status: "approved",
					termsVersion: SETTLEMENT_FEATURE_TERMS_VERSION,
					currentTermsVersion: SETTLEMENT_FEATURE_TERMS_VERSION,
					termsCurrent: true,
				});
			});

			test("assertOrganizationSettlementFeatureApproved skips gate for platform admin", async () => {
				const { assertOrganizationSettlementFeatureApproved } = await import(
					"@/lib/domains/settlement-access/settlement-access"
				);

				await expect(
					assertOrganizationSettlementFeatureApproved(orgId, {
						callerWallet: adminWallet,
					}),
				).resolves.toBeUndefined();
			});
		});
	});

	describe("recipient-ack", () => {
		const pieceCid = "bafytestpiece";
		const signer = "0x1111111111111111111111111111111111111111" as const;

		let hasRules = false;
		let inserted: unknown[] = [];

		beforeAll(() => {
			mock.module("@/lib/platform/db", () => ({
				default: {
					schema: {
						fileSettlementRules: {},
						fileSettlementRecipientAcks: {},
					},
					select: () => ({
						from: () => ({
							where: () => ({
								limit: () => dbQueryResult(hasRules ? [{ pieceCid }] : []),
							}),
						}),
					}),
					insert: () => ({
						values: (row: unknown) => {
							inserted.push(row);
							return {
								onConflictDoUpdate: () => Promise.resolve(),
							};
						},
					}),
				},
			}));
		});

		afterAll(() => {
			mock.restore();
		});

		describe("settlement recipient ack", () => {
			test("requires ack body when indexed settlement rules exist", async () => {
				hasRules = true;
				const { assertSettlementRecipientAckProvided } = await import(
					"@/lib/domains/settlement-access/utils/recipient-ack"
				);

				await expect(
					assertSettlementRecipientAckProvided({
						pieceCid,
						signerWallet: signer,
						body: {},
					}),
				).rejects.toMatchObject({
					code: "BAD_REQUEST",
					message: expect.stringContaining("Payment verification failed"),
				});
			});

			test("rejects outdated ack terms version", async () => {
				hasRules = true;
				const { assertSettlementRecipientAckProvided } = await import(
					"@/lib/domains/settlement-access/utils/recipient-ack"
				);

				await expect(
					assertSettlementRecipientAckProvided({
						pieceCid,
						signerWallet: signer,
						body: {
							settlementRecipientAck: {
								termsVersion: "stale",
								acceptedAt: Date.now(),
							},
						},
					}),
				).rejects.toMatchObject({
					code: "BAD_REQUEST",
					message: expect.stringContaining("Payment verification failed"),
				});
			});

			test("records ack with IP and user agent when rules exist", async () => {
				hasRules = true;
				inserted = [];
				const { recordSettlementRecipientAck } = await import(
					"@/lib/domains/settlement-access/utils/recipient-ack"
				);

				const acceptedAt = new Date("2026-05-01T12:00:00Z");
				await recordSettlementRecipientAck({
					pieceCid,
					signerWallet: signer,
					termsVersion: SETTLEMENT_FEATURE_TERMS_VERSION,
					acceptedAt,
					requestIp: "203.0.113.1",
					requestUserAgent: "TestAgent/1.0",
				});

				expect(inserted).toHaveLength(1);
				expect(inserted[0]).toMatchObject({
					filePieceCid: pieceCid,
					requestIp: "203.0.113.1",
					requestUserAgent: "TestAgent/1.0",
				});
			});
		});
	});

	describe("partner-trial-payout-decouple", () => {
		test("registration does not auto-grant settlement access on partner trial attach", async () => {
			const src = await Bun.file(
				new URL(
					"../../lib/domains/platform-access/registration.ts",
					import.meta.url,
				),
			).text();

			expect(src).not.toContain("grantPartnerInviteSettlementAccessWithTx");
		});
	});

	describe("settlement-access-submit", () => {
		const orgId = "00000000-0000-7000-8000-0000000000aa";
		const wallet = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const;
		let inserted: unknown[] = [];

		beforeAll(() => {
			mock.module("@/lib/domains/orgs/orgs", () => ({
				resolveActiveOrg: async () => ({
					organizationId: orgId,
					permissions: ["billing:manage"],
				}),
				assertOrgPermission: () => {},
			}));
			mock.module("@/lib/domains/entitlements", () => ({
				resolveEntitlementContext: async () => ({}),
				assertEntitlement: () => {},
			}));
			mock.module("@/lib/platform/db", () => ({
				default: {
					schema: {
						organizationSettlementFeatureAccess: {},
						organizations: {},
					},
					select: () => ({
						from: () => ({
							where: () => ({
								limit: () => dbQueryResult([]),
							}),
						}),
					}),
					insert: () => ({
						values: (row: unknown) => {
							inserted.push(row);
							return {
								onConflictDoUpdate: () => Promise.resolve(),
							};
						},
					}),
				},
			}));
		});

		afterAll(() => {
			mock.restore();
		});

		test("submit persists intake fields and request audit metadata", async () => {
			inserted = [];
			const { submitOrganizationSettlementFeatureRequest } = await import(
				"@/lib/domains/settlement-access/settlement-access"
			);

			await submitOrganizationSettlementFeatureRequest({
				wallet,
				organizationId: orgId,
				body: {
					acceptTerms: true,
					sanctionsSelfCert: true,
					useCase: "USDC bonuses for signed contractor SOWs",
					termsVersion: SETTLEMENT_FEATURE_TERMS_VERSION,
					organizationLegalName: "Acme Labs LLC",
					organizationCountry: "US",
					requesterName: "Jane Doe",
					requesterRole: "Founder",
				},
				audit: {
					requestIp: "203.0.113.42",
					requestUserAgent: "FilosignTest/1.0",
				},
			});

			expect(inserted).toHaveLength(1);
			expect(inserted[0]).toMatchObject({
				organizationId: orgId,
				status: "pending",
				organizationLegalName: "Acme Labs LLC",
				organizationCountry: "US",
				requesterName: "Jane Doe",
				requesterRole: "Founder",
				requestIp: "203.0.113.42",
				requestUserAgent: "FilosignTest/1.0",
			});
		});
	});
});
