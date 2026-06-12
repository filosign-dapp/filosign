import { afterAll, describe, expect, mock, test } from "bun:test";
import { testEnvStub } from "../support/env-stub";

const pieceCid = "bafkzcibtransition";
const r2Key = `uploads/${pieceCid}`;
const r2Bytes = new Uint8Array([1, 2, 3, 4]);

type FocUpdatePayload = {
	replicateStatus?: string;
	focVerifiedAt?: Date;
	r2EvictedAt?: Date;
	dealId?: string;
};

let deleteCalled = false;
let updatePayload: FocUpdatePayload | null = null;

mock.module("@/env", () => ({
	default: { ...testEnvStub, TEST_FOC: false },
}));

mock.module("@/lib/platform/s3/client", () => ({
	bucket: {
		exists: async () => true,
		file: () => ({
			arrayBuffer: async () => r2Bytes.buffer,
		}),
		delete: async () => {
			deleteCalled = true;
		},
	},
}));

mock.module("@/lib/domains/foc/retention-policy", () => ({
	resolveFocRetentionUntil: async () => new Date(Date.now() + 86_400_000),
}));

mock.module("@/lib/platform/foc", () => ({
	archivalCdnUrl: (cid: string) => `https://cdn.example/${cid}`,
	dealIdFromUploadResult: () => "42:7",
	getOrCreatePlatformDataset: async () => ({
		upload: async () => ({
			pieceCid: { toString: () => pieceCid },
			copies: [{ dataSetId: 42n, pieceId: 7n, role: "primary" }],
		}),
	}),
	retentionEpochsFromUntil: () => 1n,
	synapse: {
		storage: {
			prepare: async () => ({ transaction: null }),
		},
	},
}));

mock.module("@/lib/platform/db", () => ({
	default: {
		schema: {
			focObjects: {
				pieceCid: "pieceCid",
				replicateStatus: "replicateStatus",
				r2EvictedAt: "r2EvictedAt",
				r2EvictAfter: "r2EvictAfter",
				organizationId: "organizationId",
				r2Key: "r2Key",
			},
			complianceExportLogs: { id: "id", filePieceCid: "filePieceCid" },
			files: { pieceCid: "pieceCid", sender: "sender" },
		},
		select: () => ({
			from: () => ({
				where: () => ({
					limit: async () => [
						{
							replicateStatus: "pending",
							r2EvictedAt: null,
							r2EvictAfter: new Date(0),
							organizationId: "org-1",
							r2Key,
						},
					],
				}),
				innerJoin: () => ({
					where: () => ({
						limit: async () => [],
					}),
				}),
			}),
		}),
		update: () => ({
			set: (payload: FocUpdatePayload) => {
				updatePayload = payload;
				return {
					where: async () => undefined,
				};
			},
		}),
	},
}));

const originalFetch = globalThis.fetch;
globalThis.fetch = (async () =>
	new Response(r2Bytes, { status: 200 })) as unknown as typeof fetch;

const { runFocTransitionForPiece } = await import(
	"@/lib/domains/foc/lifecycle"
);

describe("runFocTransitionForPiece", () => {
	test("replicates to FOC without deleting R2 or setting r2EvictedAt", async () => {
		deleteCalled = false;
		updatePayload = null;

		await runFocTransitionForPiece(pieceCid);

		expect(deleteCalled).toBe(false);
		expect(updatePayload).not.toBeNull();
		const payload = updatePayload as unknown as FocUpdatePayload;
		expect(payload.replicateStatus).toBe("replicated");
		expect(payload.focVerifiedAt).toBeInstanceOf(Date);
		expect(payload.r2EvictedAt).toBeUndefined();
		expect(payload.dealId).toBe("42:7");
	});
});

afterAll(() => {
	globalThis.fetch = originalFetch;
});
