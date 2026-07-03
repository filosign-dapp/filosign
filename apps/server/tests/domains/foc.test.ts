import { describe, expect, test } from "bun:test";
import { check } from "@filosign/entitlements";
import { exportGraceEnd } from "@/lib/domains/archival";
import {
	ARCHIVAL_PRODUCT_IDS,
	archivalTermYears,
	listArchivalCatalogProducts,
	resolveArchivalProductIdFromDodoProduct,
} from "@/lib/domains/billing/utils/archival-products";
import type { EnvelopeRegistryProgress } from "@/lib/domains/files/utils/piece-helpers";
import { envelopeRoutingCompleteFromProgress } from "@/lib/domains/files/utils/piece-helpers";
import {
	isFocBackupEnabled,
	isFocRetrievalEnabled,
} from "@/lib/domains/foc/enabled";
import { isFocTransitionDue } from "@/lib/domains/foc/lifecycle";
import { assertFocBytesMatch } from "@/lib/domains/foc/utils/cdn-verify";
import { retentionEpochsFromUntil } from "@/lib/platform/foc/retention";
import {
	archivalCdnUrl,
	assertCompleteSynapseUpload,
	dataSetIdFromDealId,
	dealIdFromUploadResult,
	filbeamRetrievalHost,
	summarizeSynapseUploadResult,
} from "@/lib/platform/foc/synapse";
import { focTransitionJobId } from "@/lib/platform/jobs/utils/idempotency";
import { testEnvStub } from "../support/env-stub";
import { uploadResultStub } from "../support/upload-result-stub";

describe("foc", () => {
	describe("foc-synapse", () => {
		describe("filbeamRetrievalHost", () => {
			test("mainnet uses wallet.filbeam.io (no mainnet subdomain label)", () => {
				expect(filbeamRetrievalHost("mainnet")).toBe("filbeam.io");
			});

			test("testnet and local use calibration.filbeam.io", () => {
				expect(filbeamRetrievalHost("testnet")).toBe("calibration.filbeam.io");
				expect(filbeamRetrievalHost("local")).toBe("calibration.filbeam.io");
			});
		});

		describe("archivalCdnUrl", () => {
			test("uses calibration host when CHAIN is local (test stub)", () => {
				expect(archivalCdnUrl("bafkzcibexample")).toBe(
					`https://${testEnvStub.FOC_WALLET_ADDRESS}.calibration.filbeam.io/bafkzcibexample`,
				);
			});
		});

		describe("retentionEpochsFromUntil", () => {
			test("returns positive epochs for future retention", () => {
				const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
				expect(retentionEpochsFromUntil(future) > 0n).toBe(true);
			});

			test("returns 0 when retention is in the past", () => {
				expect(retentionEpochsFromUntil(new Date(Date.now() - 60_000))).toBe(
					0n,
				);
			});
		});

		describe("dataSetIdFromDealId", () => {
			test("parses dataSetId prefix from deal_id", () => {
				expect(dataSetIdFromDealId("14361:0")).toBe(14361n);
			});

			test("throws on invalid deal_id", () => {
				expect(() => dataSetIdFromDealId("bad")).toThrow(/Invalid FOC deal_id/);
			});
		});

		describe("dealIdFromUploadResult", () => {
			test("formats dataSetId and pieceId from primary copy", () => {
				const result = uploadResultStub({
					copies: [{ dataSetId: 42n, pieceId: 7n, role: "primary" }],
				});
				expect(dealIdFromUploadResult(result)).toBe("42:7");
			});

			test("throws when no copies committed", () => {
				const result = uploadResultStub({ copies: [] });
				expect(() => dealIdFromUploadResult(result)).toThrow(
					/no committed copies/,
				);
			});

			test("throws when Synapse reports an incomplete upload", () => {
				const result = uploadResultStub({
					complete: false,
					copies: [{ dataSetId: 42n, pieceId: 7n, role: "primary" }],
				});
				expect(() => assertCompleteSynapseUpload(result)).toThrow(
					/did not complete/,
				);
			});

			test("summarizes upload result without bigint JSON issues", () => {
				const result = uploadResultStub({
					complete: false,
					requestedCopies: 2,
					size: 69660n,
					copies: [
						{
							dataSetId: 1319n,
							pieceId: 15n,
							role: "primary",
							providerId: 1n,
							retrievalUrl: "https://provider.example/piece/bafk",
							isNewDataSet: false,
						},
					],
					failedAttempts: [{ providerId: 2n, reason: "unreachable" }],
					pieceCid: { toString: () => "bafkzcibexample" },
				});

				expect(summarizeSynapseUploadResult(result)).toEqual({
					pieceCid: "bafkzcibexample",
					complete: false,
					requestedCopies: 2,
					size: "69660",
					copies: [
						{
							dataSetId: "1319",
							pieceId: "15",
							role: "primary",
							providerId: "1",
							retrievalUrl: "https://provider.example/piece/bafk",
							isNewDataSet: false,
						},
					],
					failedAttemptsCount: 1,
					failedAttempts: [
						{ providerId: "2", error: undefined, reason: "unreachable" },
					],
				});
			});
		});

		describe("focTransitionJobId", () => {
			test("uses bullmq-safe separator", () => {
				const id = focTransitionJobId("bafkzcibexample");
				expect(id).toBe("foc__bafkzcibexample");
				expect(id.includes(":")).toBe(false);
			});
		});

		function registryProgress(
			overrides: Partial<EnvelopeRegistryProgress>,
		): EnvelopeRegistryProgress {
			return {
				routingMode: 0,
				requiredSignersCount: 3,
				requiredSignaturesCount: 0,
				quorumN: 0,
				completedAt: null,
				revokedBeforeCompletedAt: null,
				revokedBy: null,
				nextSignerEmail: null,
				routingOrderEmails: null,
				canSignByRouting: true,
				...overrides,
			};
		}

		describe("envelopeRoutingCompleteFromProgress", () => {
			test("complete when completedAt is set", () => {
				expect(
					envelopeRoutingCompleteFromProgress(
						registryProgress({ completedAt: 1_700_000_000 }),
					),
				).toBe(true);
			});

			test("incomplete when completedAt is null", () => {
				expect(
					envelopeRoutingCompleteFromProgress(
						registryProgress({ requiredSignaturesCount: 3 }),
					),
				).toBe(false);
			});
		});
	});

	describe("foc-lifecycle", () => {
		describe("FOC feature flags", () => {
			test("isFocBackupEnabled reads env default false from stub", () => {
				expect(isFocBackupEnabled()).toBe(false);
			});

			test("isFocRetrievalEnabled reads env default false from stub", () => {
				expect(isFocRetrievalEnabled()).toBe(false);
			});
		});

		describe("isFocTransitionDue", () => {
			test("pending without r2 eviction is due", () => {
				expect(
					isFocTransitionDue({
						replicateStatus: "pending",
						r2EvictedAt: null,
					}),
				).toBe(true);
			});

			test("replicated is not due", () => {
				expect(
					isFocTransitionDue({
						replicateStatus: "replicated",
						r2EvictedAt: null,
					}),
				).toBe(false);
			});

			test("r2 evicted pending is not due", () => {
				expect(
					isFocTransitionDue({
						replicateStatus: "pending",
						r2EvictedAt: new Date(),
					}),
				).toBe(false);
			});
		});

		describe("assertFocBytesMatch", () => {
			test("accepts identical bytes", () => {
				expect(() =>
					assertFocBytesMatch({
						pieceCid: "bafkzcibexample",
						source: "test",
						actualBytes: new Uint8Array([1, 2, 3]),
						expectedBytes: new Uint8Array([1, 2, 3]),
					}),
				).not.toThrow();
			});

			test("throws on mismatched bytes", () => {
				expect(() =>
					assertFocBytesMatch({
						pieceCid: "bafkzcibexample",
						source: "test",
						actualBytes: new Uint8Array([1, 2, 3]),
						expectedBytes: new Uint8Array([1, 2, 4]),
					}),
				).toThrow(/FOC test bytes mismatch/);
			});
		});
	});

	describe("foc-retention-policy", () => {
		describe("FOC retention policy (documented behavior)", () => {
			test("archival can outlive workspace when dates differ", () => {
				const workspaceEnd = new Date("2026-06-01T00:00:00.000Z");
				const archivalEnd = new Date("2030-01-01T00:00:00.000Z");
				const effective =
					workspaceEnd.getTime() >= archivalEnd.getTime()
						? workspaceEnd
						: archivalEnd;
				expect(effective).toEqual(archivalEnd);
			});
		});
	});

	describe("archival-catalog", () => {
		describe("archival products catalog", () => {
			test("lists two SKUs", () => {
				const products = listArchivalCatalogProducts();
				expect(products).toHaveLength(2);
				expect(products.map((p) => p.productId).sort()).toEqual(
					[...ARCHIVAL_PRODUCT_IDS].sort(),
				);
			});

			test("term years and list prices match product ids", () => {
				expect(archivalTermYears("archival_year")).toBe(1);
				expect(archivalTermYears("archival_bundle_3y")).toBe(3);
				const products = listArchivalCatalogProducts();
				expect(
					products.find((p) => p.productId === "archival_year")?.amountUsd,
				).toBe(49);
				expect(
					products.find((p) => p.productId === "archival_bundle_3y")?.amountUsd,
				).toBe(99);
			});

			test("live archival Dodo ids map to catalog products", () => {
				expect(
					resolveArchivalProductIdFromDodoProduct("pdt_0NhfzjA2HBxXSAniOOz4c"),
				).toBe("archival_year");
				expect(
					resolveArchivalProductIdFromDodoProduct("pdt_0NhfzqhROk5bLAJAc6JyZ"),
				).toBe("archival_bundle_3y");
			});

			test("test archival Dodo ids map to catalog products", () => {
				expect(
					resolveArchivalProductIdFromDodoProduct("pdt_0NgMNUvCPUVHCwwTyW2m9"),
				).toBe("archival_year");
				expect(
					resolveArchivalProductIdFromDodoProduct("pdt_0NgMNh7e1JVDEcvpio6YA"),
				).toBe("archival_bundle_3y");
			});

			test("archival Dodo products do not map to workspace plans", () => {
				expect(
					resolveArchivalProductIdFromDodoProduct("pdt_0NfmPizJ6Qed3qp9tEeim"),
				).toBeNull();
			});
		});

		describe("features.archival.purchase entitlement", () => {
			test("enabled on Solo, disabled on Free", () => {
				const free = check(
					{
						subject: { type: "user", wallet: "0x1" },
						planId: "free",
						periodStart: new Date(),
						usage: {},
					},
					"features.archival.purchase",
				);
				const solo = check(
					{
						subject: { type: "user", wallet: "0x1" },
						planId: "individual",
						periodStart: new Date(),
						usage: {},
					},
					"features.archival.purchase",
				);
				expect(free.allowed).toBe(false);
				expect(solo.allowed).toBe(true);
			});
		});

		describe("exportGraceEnd", () => {
			test("defaults to 30 days ahead", () => {
				const from = new Date("2026-01-01T00:00:00.000Z");
				const end = exportGraceEnd(from);
				const diffDays = Math.round(
					(end.getTime() - from.getTime()) / (24 * 60 * 60 * 1000),
				);
				expect(diffDays).toBe(30);
			});
		});
	});
});
