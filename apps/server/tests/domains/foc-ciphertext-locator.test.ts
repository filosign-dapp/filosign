import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { privateKeyToAccount } from "viem/accounts";
import { testEnvStub } from "../support/env-stub";

const pieceCid = "bafkzcibtestpiececid";
const presignedUrl = "https://r2.example.com/presigned";
const focWalletAddress = privateKeyToAccount(
	"0x0000000000000000000000000000000000000000000000000000000000000003",
).address;

let existsResult = true;
let focRow: {
	replicateStatus: "pending" | "replicated";
	focVerifiedAt: Date | null;
} | null = null;
let envOverrides: Record<string, unknown> = {};

mock.module("@/env", () => ({
	default: {
		...testEnvStub,
		get FOC_RETRIEVAL() {
			return envOverrides.FOC_RETRIEVAL ?? testEnvStub.FOC_RETRIEVAL;
		},
	},
}));

mock.module("@/lib/platform/s3/client", () => ({
	bucket: {
		exists: async () => existsResult,
		presign: (key: string, opts: { method: string }) =>
			`${presignedUrl}/${key}?method=${opts.method}`,
	},
}));

mock.module("@/lib/platform/db", () => ({
	default: {
		schema: {
			focObjects: {
				replicateStatus: "replicateStatus",
				focVerifiedAt: "focVerifiedAt",
				pieceCid: "pieceCid",
			},
		},
		select: () => ({
			from: () => ({
				where: () => ({
					limit: async () => (focRow ? [focRow] : []),
				}),
			}),
		}),
	},
}));

describe("resolveCiphertextDownloadUrl", () => {
	beforeEach(() => {
		existsResult = true;
		focRow = null;
		envOverrides = {};
	});

	afterEach(() => {
		envOverrides = {};
	});

	test("returns R2 presign when FOC_RETRIEVAL is off", async () => {
		const { resolveCiphertextDownloadUrl } = await import(
			"@/lib/domains/foc/ciphertext-locator"
		);
		const url = await resolveCiphertextDownloadUrl(pieceCid);
		expect(url).toBe(`${presignedUrl}/uploads/${pieceCid}?method=GET`);
	});

	test("throws FILES.NOT_FOUND when R2 object is missing and FOC_RETRIEVAL is off", async () => {
		existsResult = false;
		const { resolveCiphertextDownloadUrl } = await import(
			"@/lib/domains/foc/ciphertext-locator"
		);
		await expect(resolveCiphertextDownloadUrl(pieceCid)).rejects.toThrow(
			/FILES\.NOT_FOUND|not found/i,
		);
	});

	test("returns FilBeam URL when FOC_RETRIEVAL is on and object is replicated", async () => {
		envOverrides = { FOC_RETRIEVAL: true };
		focRow = {
			replicateStatus: "replicated",
			focVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
		};

		const { resolveCiphertextDownloadUrl } = await import(
			"@/lib/domains/foc/ciphertext-locator"
		);
		const url = await resolveCiphertextDownloadUrl(pieceCid);
		expect(url).toBe(
			`https://${focWalletAddress}.calibration.filbeam.io/${pieceCid}`,
		);
	});

	test("bypasses R2 when FOC_RETRIEVAL is on and object is replicated", async () => {
		envOverrides = { FOC_RETRIEVAL: true };
		existsResult = false;
		focRow = {
			replicateStatus: "replicated",
			focVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
		};

		const { resolveCiphertextDownloadUrl } = await import(
			"@/lib/domains/foc/ciphertext-locator"
		);
		const url = await resolveCiphertextDownloadUrl(pieceCid);
		expect(url).toContain(".filbeam.io/");
	});

	test("falls back to R2 when FOC_RETRIEVAL is on but FOC is still pending", async () => {
		envOverrides = { FOC_RETRIEVAL: true };
		focRow = {
			replicateStatus: "pending",
			focVerifiedAt: null,
		};

		const { resolveCiphertextDownloadUrl } = await import(
			"@/lib/domains/foc/ciphertext-locator"
		);
		const url = await resolveCiphertextDownloadUrl(pieceCid);
		expect(url).toBe(`${presignedUrl}/uploads/${pieceCid}?method=GET`);
	});
});
