import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LOCAL_MOCK_USDC_ADDRESS } from "@filosign/contracts";
import type { EntitlementContext } from "@filosign/entitlements";
import type { SettlementRuleRegistrationInput } from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import { getAddress } from "viem";
import { assertSettlementRulesUsdcToken } from "@/lib/domains/settlements/utils/assert-settlement-token";
import {
	assertSettlementRuleEntitlements,
	assertSettlementUpdateEntitlements,
} from "@/lib/domains/settlements/utils/entitlements";
import { dbQueryResult } from "../support/db-query-result";

describe("settlements", () => {
	afterAll(() => {
		mock.restore();
	});

	describe("settlement-preflight", () => {
		describe("payerCanFundSettlement", () => {
			test("reads rule state via fsPaymentValidatorAt(args.validator)", () => {
				const src = readFileSync(
					join(
						import.meta.dir,
						"../../lib/domains/settlements/utils/preflight.ts",
					),
					"utf8",
				);
				expect(src).toContain("fsPaymentValidatorAt(args.validator)");
				expect(src).not.toMatch(
					/const validator = fsContracts\.FSPaymentValidator/,
				);
			});
		});

		describe("wrapAttachmentPacketDekForWarm", () => {
			test("normalizes recipient email in KEM info", () => {
				const src = readFileSync(
					join(
						import.meta.dir,
						"../../../../packages/react-sdk/src/lib/attachment-packets.ts",
					),
					"utf8",
				);
				expect(src).toContain(
					"normalizePlacementRecipientEmail(args.recipient.email)",
				);
			});
		});

		describe("tryExecuteSettlementPayout", () => {
			test("loads settlement rules by validatorAddress and onChainRuleId", () => {
				const src = readFileSync(
					join(
						import.meta.dir,
						"../../lib/domains/settlements/utils/execute-payout.ts",
					),
					"utf8",
				);
				expect(src).toContain(
					"selectSettlementRule(onChainRuleId, validatorAddress)",
				);
				expect(src).not.toMatch(
					/eq\(fileSettlementRules\.onChainRuleId,\s*onChainRuleId\)[\s\S]*?\.limit\(1\)/,
				);
			});

			test("simulates executePayoutLeg before broadcasting write", () => {
				const src = readFileSync(
					join(
						import.meta.dir,
						"../../lib/domains/settlements/utils/execute-payout.ts",
					),
					"utf8",
				);
				expect(src).toContain("validator.simulate.executePayoutLeg");
				expect(src).toContain("writeValidator.executePayoutLeg");
				const simIdx = src.indexOf("validator.simulate.executePayoutLeg");
				const writeIdx = src.indexOf("writeValidator.executePayoutLeg");
				expect(simIdx).toBeGreaterThan(-1);
				expect(writeIdx).toBeGreaterThan(simIdx);
			});
		});
	});

	describe("settlement-receipt-wait", () => {
		describe("settlement receipt verification", () => {
			test("assertTxSucceeded waits for mined receipts", () => {
				const src = readFileSync(
					join(
						import.meta.dir,
						"../../lib/domains/settlements/utils/verify-rules-on-chain.ts",
					),
					"utf8",
				);
				expect(src).toContain("evmClient.waitForTransactionReceipt({ hash })");
				expect(src).not.toContain("evmClient.getTransactionReceipt({ hash })");
			});
		});
	});

	describe("settlement-entitlements", () => {
		const orgId = "00000000-0000-7000-8000-000000000001";

		beforeAll(() => {
			mock.module("@/lib/domains/settlement-access/settlement-access", () => ({
				assertOrganizationSettlementFeatureApproved: async () => {},
			}));
		});

		function ctx(planId: "teams" | "teams_pro"): EntitlementContext {
			return {
				subject: {
					type: "user",
					wallet: "0x0000000000000000000000000000000000000001",
				},
				planId,
				periodStart: new Date("2026-05-01T00:00:00Z"),
				usage: {},
			};
		}

		const baseRule = (
			overrides: Partial<SettlementRuleRegistrationInput> = {},
		): SettlementRuleRegistrationInput => ({
			onChainRuleId: "1",
			legs: [
				{
					recipientWallet: "0x0000000000000000000000000000000000000001",
					recipientSource: "signer",
					amount: "1000000",
				},
			],
			tokenAddress: "0x0000000000000000000000000000000000000abc",
			cidIdentifier:
				"0x0000000000000000000000000000000000000000000000000000000000000001",
			releaseType: "all_signed",
			releaseParams: { releaseType: "all_signed" },
			registerRuleTxHash:
				"0x0000000000000000000000000000000000000000000000000000000000000002",
			approveTxHash:
				"0x0000000000000000000000000000000000000000000000000000000000000003",
			...overrides,
		});

		describe("settlement entitlements", () => {
			test("rejects payout registration without workspace organizationId", async () => {
				await expect(
					assertSettlementRuleEntitlements(ctx("teams"), baseRule(), null),
				).rejects.toMatchObject({
					code: "FORBIDDEN",
					message: expect.stringContaining("workspace envelope"),
				});
			});

			test("allows basic single-leg all_signed on teams with workspace", async () => {
				await assertSettlementRuleEntitlements(ctx("teams"), baseRule(), orgId);
			});

			test("rejects multi-leg rules without advanced entitlement", async () => {
				await expect(
					assertSettlementRuleEntitlements(
						ctx("teams"),
						baseRule({
							legs: [
								...baseRule().legs,
								{
									recipientWallet: "0x0000000000000000000000000000000000000002",
									recipientSource: "signer",
									amount: "1000000",
								},
							],
						}),
						orgId,
					),
				).rejects.toBeInstanceOf(ORPCError);
			});

			test("allows advanced release types on teams_pro", async () => {
				await assertSettlementRuleEntitlements(
					ctx("teams_pro"),
					baseRule({
						releaseType: "quorum_all",
						releaseParams: { releaseType: "quorum_all", thresholdN: 2 },
					}),
					orgId,
				);
			});

			test("update requires workspace and advanced entitlement", async () => {
				await expect(
					assertSettlementUpdateEntitlements(ctx("teams"), null),
				).rejects.toMatchObject({
					code: "FORBIDDEN",
					message: expect.stringContaining("workspace envelope"),
				});
				await expect(
					assertSettlementUpdateEntitlements(ctx("teams"), orgId),
				).rejects.toBeInstanceOf(ORPCError);
				await assertSettlementUpdateEntitlements(ctx("teams_pro"), orgId);
			});
		});
	});

	describe("verify-rules-payers", () => {
		const sender = "0x1111111111111111111111111111111111111111" as const;
		const treasury = "0x2222222222222222222222222222222222222222" as const;
		const otherWallet = "0x3333333333333333333333333333333333333333" as const;
		const orgId = "00000000-0000-7000-8000-000000000088";

		beforeAll(() => {
			mock.module("@/lib/platform/db", () => ({
				default: {
					schema: {
						organizations: {
							id: "id",
							orgWalletAddress: "orgWalletAddress",
						},
					},
					select: () => ({
						from: () => ({
							where: () => ({
								limit: () =>
									dbQueryResult([{ orgWalletAddress: getAddress(treasury) }]),
							}),
						}),
					}),
				},
			}));
		});

		describe("resolveAllowedSettlementPayers", () => {
			test("includes sender and linked org treasury", async () => {
				const { resolveAllowedSettlementPayers } = await import(
					"@/lib/domains/settlements/utils/verify-rules-on-chain"
				);

				const allowed = await resolveAllowedSettlementPayers(sender, orgId);

				expect(allowed.has(getAddress(sender).toLowerCase())).toBe(true);
				expect(allowed.has(getAddress(treasury).toLowerCase())).toBe(true);
				expect(allowed.has(getAddress(otherWallet).toLowerCase())).toBe(false);
				expect(allowed.size).toBe(2);
			});

			test("sender only when organizationId omitted", async () => {
				const { resolveAllowedSettlementPayers } = await import(
					"@/lib/domains/settlements/utils/verify-rules-on-chain"
				);

				const allowed = await resolveAllowedSettlementPayers(sender, null);

				expect(allowed.size).toBe(1);
				expect(allowed.has(getAddress(sender).toLowerCase())).toBe(true);
			});
		});
	});

	describe("settlements-register-gates", () => {
		const usdcToken = LOCAL_MOCK_USDC_ADDRESS
			? getAddress(LOCAL_MOCK_USDC_ADDRESS)
			: ("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const);

		const participant = "0x1111111111111111111111111111111111111111" as const;

		function rule(
			overrides: Partial<SettlementRuleRegistrationInput> = {},
		): SettlementRuleRegistrationInput {
			return {
				onChainRuleId: "1",
				legs: [
					{
						recipientWallet: participant,
						recipientSource: "signer",
						amount: "1000000",
					},
				],
				tokenAddress: usdcToken,
				cidIdentifier:
					"0x0000000000000000000000000000000000000000000000000000000000000001",
				releaseType: "all_signed",
				releaseParams: { releaseType: "all_signed" },
				registerRuleTxHash:
					"0x0000000000000000000000000000000000000000000000000000000000000002",
				approveTxHash:
					"0x0000000000000000000000000000000000000000000000000000000000000003",
				...overrides,
			};
		}

		describe("settlements register gates", () => {
			test("rejects non-USDC token on local chain config", () => {
				expect(() =>
					assertSettlementRulesUsdcToken([
						rule({
							tokenAddress: "0x0000000000000000000000000000000000000001",
						}),
					]),
				).toThrow();
			});

			test("rejects recipient not on envelope", async () => {
				const { assertSettlementRecipientsAllowlisted } = await import(
					"@/lib/domains/settlements/register"
				);
				await expect(
					assertSettlementRecipientsAllowlisted({
						participantWallets: [getAddress(participant)],
						rules: [
							rule({
								legs: [
									{
										recipientWallet:
											"0x2222222222222222222222222222222222222222",
										recipientSource: "signer",
										amount: "1",
									},
								],
							}),
						],
					}),
				).rejects.toMatchObject({
					code: "BAD_REQUEST",
					message: expect.stringContaining("envelope"),
				});
			});
		});
	});

	describe("attachment-release-execute", () => {
		const serverRoot = join(import.meta.dir, "../..");

		describe("attachment release execution", () => {
			test("post-sign hook calls tryExecuteAttachmentReleasesForPiece", () => {
				const src = readFileSync(
					join(serverRoot, "lib/domains/files/sign.ts"),
					"utf8",
				);
				expect(src).toContain("tryExecuteAttachmentReleasesForPiece");
			});

			test("cron registers sync-attachment-releases", () => {
				const src = readFileSync(
					join(serverRoot, "lib/platform/cron/index.ts"),
					"utf8",
				);
				expect(src).toContain("registerSyncAttachmentReleasesCron");
			});
		});
	});
});
