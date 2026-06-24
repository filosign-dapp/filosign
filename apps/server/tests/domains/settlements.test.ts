import { describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { EntitlementContext } from "@filosign/entitlements";
import { LOCAL_MOCK_USDC_ADDRESS } from "@filosign/evm";
import type { SettlementRuleRegistrationInput } from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import { getAddress } from "viem";

mock.module("@/lib/domains/settlement-access/settlement-access", () => ({
	assertOrganizationSettlementFeatureApproved: async () => {},
	assertOrganizationExternalWalletAccessEnabled: async () => {},
}));

import { assertSettlementRulesUsdcToken } from "@/lib/domains/settlements/utils/assert-settlement-token";
import {
	assertSettlementRuleEntitlements,
	assertSettlementUpdateEntitlements,
} from "@/lib/domains/settlements/utils/entitlements";
import {
	isRetryablePayoutSkip,
	SettlementPayoutRetryableError,
	shouldRetryPayoutSkip,
} from "@/lib/domains/settlements/utils/execute/payout-readiness";

describe("settlements", () => {
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

		describe("payout-readiness", () => {
			test("isRetryablePayoutSkip marks not_executable and partial as retryable", () => {
				expect(isRetryablePayoutSkip("not_executable", {})).toBe(true);
				expect(isRetryablePayoutSkip(undefined, { partial: true })).toBe(true);
				expect(isRetryablePayoutSkip("failed_relay", {})).toBe(true);
				expect(isRetryablePayoutSkip("insufficient_funds", {})).toBe(false);
				expect(isRetryablePayoutSkip("already_executed", {})).toBe(false);
			});

			test("preflight polls canExecute instead of a single read", () => {
				const preflightSrc = readFileSync(
					join(
						import.meta.dir,
						"../../lib/domains/settlements/utils/execute/payout-preflight.ts",
					),
					"utf8",
				);
				expect(preflightSrc).toContain("pollCanExecute");
				expect(preflightSrc).not.toContain(
					"validator.read.canExecute([onChainRuleId])",
				);
			});

			test("payout-leg resolves executed status via resolveLegPayoutExecuted", () => {
				const legSrc = readFileSync(
					join(
						import.meta.dir,
						"../../lib/domains/settlements/utils/execute/payout-leg.ts",
					),
					"utf8",
				);
				expect(legSrc).toContain("resolveLegPayoutExecuted");
				expect(legSrc).not.toContain("pollUntilRuleExecuted");
			});

			test("payout-lock polls before writing partial status", () => {
				const lockSrc = readFileSync(
					join(
						import.meta.dir,
						"../../lib/domains/settlements/utils/execute/payout-lock.ts",
					),
					"utf8",
				);
				expect(lockSrc).toContain("pollUntilRuleExecuted");
				const partialIdx = lockSrc.indexOf('status: "partial"');
				const pollIdx = lockSrc.indexOf("pollUntilRuleExecuted");
				expect(pollIdx).toBeGreaterThan(-1);
				expect(pollIdx).toBeLessThan(partialIdx);
			});

			test("SettlementPayoutRetryableError carries pieceCid for worker retries", () => {
				const err = new SettlementPayoutRetryableError(
					"not_executable",
					"bafyabc",
				);
				expect(err.pieceCid).toBe("bafyabc");
				expect(err.reason).toBe("not_executable");
			});

			test("shouldRetryPayoutSkip gates not_executable when envelope incomplete", () => {
				expect(
					shouldRetryPayoutSkip(
						"not_executable",
						{},
						{
							waitingForMoreSigners: true,
						},
					),
				).toBe(false);
				expect(
					shouldRetryPayoutSkip(
						"not_executable",
						{},
						{
							waitingForMoreSigners: false,
						},
					),
				).toBe(true);
			});

			test("routing-complete enqueues payout after envelope completion", () => {
				const src = readFileSync(
					join(
						import.meta.dir,
						"../../lib/domains/files/utils/sign/routing-complete.ts",
					),
					"utf8",
				);
				expect(src).toContain("enqueuePayoutForPiece(args.pieceCid)");
			});

			test("post-actions gates payout enqueue while waiting for signers", () => {
				const src = readFileSync(
					join(
						import.meta.dir,
						"../../lib/domains/files/utils/sign/post-actions.ts",
					),
					"utf8",
				);
				expect(src).toContain("shouldEnqueuePayoutOnSign");
			});

			test("addPostSignChainJob removes failed or completed jobs before re-add", () => {
				const src = readFileSync(
					join(import.meta.dir, "../../lib/platform/jobs/queues.ts"),
					"utf8",
				);
				expect(src).toContain('state === "completed" || state === "failed"');
				expect(src).toContain("await existing.remove()");
			});
		});

		describe("treasury authorization hardening", () => {
			test("registerForFile rejects organizationId mismatch with file org", () => {
				const src = readFileSync(
					join(import.meta.dir, "../../lib/domains/settlements/register.ts"),
					"utf8",
				);
				expect(src).toContain("organizationId &&");
				expect(src).toContain(
					"organizationId !== (file.organizationId ?? undefined)",
				);
				expect(src).toContain('throw throwAppError("SETTLEMENTS.FORBIDDEN")');
			});

			test("update verification resolves allowed payers with file organizationId", () => {
				const src = readFileSync(
					join(
						import.meta.dir,
						"../../lib/domains/settlements/utils/verify/rules-on-chain.ts",
					),
					"utf8",
				);
				expect(src).toContain("organizationId?: string | null");
				expect(src).toContain("resolveAllowedSettlementPayers(");
				expect(src).toContain("sender,");
				expect(src).toContain("organizationId,");
			});

			test("update/cancel auth allows file sender in addition to payer wallet", () => {
				const src = readFileSync(
					join(import.meta.dir, "../../lib/domains/settlements/crud.ts"),
					"utf8",
				);
				expect(src).toContain("const isRulePayer =");
				expect(src).toContain("const isFileSender =");
				expect(src).toContain(
					"if (!isRulePayer && !isFileSender && !isLinkedOrgTreasury)",
				);
			});
		});

		describe("tryExecuteSettlementPayout", () => {
			test("loads settlement rules by validatorAddress and onChainRuleId", () => {
				const preflightSrc = readFileSync(
					join(
						import.meta.dir,
						"../../lib/domains/settlements/utils/execute/payout-preflight.ts",
					),
					"utf8",
				);
				expect(preflightSrc).toContain(
					"selectSettlementRule(onChainRuleId, validatorAddress)",
				);
				expect(preflightSrc).not.toMatch(
					/eq\(fileSettlementRules\.onChainRuleId,\s*onChainRuleId\)[\s\S]*?\.limit\(1\)/,
				);
			});

			test("payout-leg uses pinned relayer wallet for simulate and write", () => {
				const legSrc = readFileSync(
					join(
						import.meta.dir,
						"../../lib/domains/settlements/utils/execute/payout-leg.ts",
					),
					"utf8",
				);
				expect(legSrc).toContain("fsPaymentValidatorForRelayer");
				expect(legSrc).toContain("getRelayerWalletClient(args.relayerAddress)");
				expect(legSrc).not.toContain("evmClient.account");
			});

			test("simulates executePayoutLeg before broadcasting write", () => {
				const legSrc = readFileSync(
					join(
						import.meta.dir,
						"../../lib/domains/settlements/utils/execute/payout-leg.ts",
					),
					"utf8",
				);
				expect(legSrc).toContain("validator.simulate.executePayoutLeg");
				expect(legSrc).toContain("writeValidator.executePayoutLeg");
				const simIdx = legSrc.indexOf("validator.simulate.executePayoutLeg");
				const writeIdx = legSrc.indexOf("writeValidator.executePayoutLeg");
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
						"../../lib/domains/settlements/utils/verify/rules-on-chain.ts",
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

		function ctx(
			planId: "free" | "individual" | "teams" | "teams_pro",
		): EntitlementContext {
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
					message: expect.stringContaining("Access denied"),
				});
			});

			test("allows basic single-leg all_signed on teams with workspace", async () => {
				await assertSettlementRuleEntitlements(ctx("teams"), baseRule(), orgId);
			});

			test("allows basic single-leg all_signed on individual with workspace", async () => {
				await assertSettlementRuleEntitlements(
					ctx("individual"),
					baseRule(),
					orgId,
				);
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
					message: expect.stringContaining("Access denied"),
				});
				await expect(
					assertSettlementUpdateEntitlements(ctx("teams"), orgId),
				).rejects.toBeInstanceOf(ORPCError);
				await expect(
					assertSettlementUpdateEntitlements(ctx("free"), orgId),
				).rejects.toBeInstanceOf(ORPCError);
				await assertSettlementUpdateEntitlements(ctx("teams_pro"), orgId);
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
					message: expect.stringContaining("Payment verification failed"),
				});
			});

			test("allows external recipient not on envelope", async () => {
				const { assertSettlementRecipientsAllowlisted } = await import(
					"@/lib/domains/settlements/register"
				);
				await assertSettlementRecipientsAllowlisted({
					participantWallets: [getAddress(participant)],
					rules: [
						rule({
							legs: [
								{
									recipientWallet: "0x2222222222222222222222222222222222222222",
									recipientSource: "external",
									amount: "1",
								},
							],
						}),
					],
				});
			});

			test("register path asserts external wallet org grant", async () => {
				const src = readFileSync(
					join(import.meta.dir, "../../lib/domains/settlements/register.ts"),
					"utf8",
				);
				expect(src).toContain("assertOrganizationExternalWalletAccessEnabled");
				expect(src).toContain('leg.recipientSource === "external"');
			});
		});
	});

	describe("attachment-release-execute", () => {
		const serverRoot = join(import.meta.dir, "../..");

		describe("attachment release execution", () => {
			test("post-sign hook calls tryExecuteAttachmentReleasesForPiece", () => {
				const src = readFileSync(
					join(serverRoot, "lib/domains/files/utils/sign/post-actions.ts"),
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
