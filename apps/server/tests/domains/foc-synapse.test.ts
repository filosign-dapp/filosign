import { describe, expect, test } from "bun:test";
import type { EnvelopeRegistryProgress } from "@/lib/domains/files/utils/piece-helpers";
import { envelopeRoutingCompleteFromProgress } from "@/lib/domains/files/utils/piece-helpers";
import { retentionEpochsFromUntil } from "@/lib/platform/foc/retention";
import {
	dataSetIdFromDealId,
	dealIdFromUploadResult,
} from "@/lib/platform/foc/synapse";
import { focTransitionJobId } from "@/lib/platform/jobs/utils/idempotency";
import { uploadResultStub } from "../support/upload-result-stub";

describe("retentionEpochsFromUntil", () => {
	test("returns positive epochs for future retention", () => {
		const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
		expect(retentionEpochsFromUntil(future) > 0n).toBe(true);
	});

	test("returns 0 when retention is in the past", () => {
		expect(retentionEpochsFromUntil(new Date(Date.now() - 60_000))).toBe(0n);
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
		expect(() => dealIdFromUploadResult(result)).toThrow(/no committed copies/);
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
