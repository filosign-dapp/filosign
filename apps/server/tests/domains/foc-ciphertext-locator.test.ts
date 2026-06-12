import { afterEach, describe, expect, mock, test } from "bun:test";
import { testEnvStub } from "../support/env-stub";

const pieceCid = "bafkzcibexample";
const r2Key = `uploads/${pieceCid}`;
const focCdnUrl = `https://${testEnvStub.FC_SERVER_ADDRESS}.calibration.filbeam.io/${pieceCid}`;

let bucketExists = false;
let presignUrl = "https://r2.example.com/presigned";
let focRow: {
	replicateStatus: "pending" | "replicated";
	focVerifiedAt: Date | null;
} | null = null;
let testFoc = false;

mock.module("@/env", () => ({
	default: {
		...testEnvStub,
		get TEST_FOC() {
			return testFoc;
		},
	},
}));

mock.module("@/lib/platform/s3/client", () => ({
	bucket: {
		exists: async (key: string) => key === r2Key && bucketExists,
		presign: (key: string) => {
			if (key !== r2Key) throw new Error("unexpected key");
			return presignUrl;
		},
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

mock.module("@/lib/platform/foc", () => ({
	archivalCdnUrl: (cid: string) =>
		`https://${testEnvStub.FC_SERVER_ADDRESS}.calibration.filbeam.io/${cid}`,
}));

const { resolveCiphertextDownloadUrl } = await import(
	"@/lib/domains/foc/ciphertext-locator"
);

afterEach(() => {
	bucketExists = false;
	presignUrl = "https://r2.example.com/presigned";
	focRow = null;
	testFoc = false;
});

describe("resolveCiphertextDownloadUrl", () => {
	test("returns R2 presign when R2 exists and TEST_FOC is false", async () => {
		bucketExists = true;
		focRow = {
			replicateStatus: "replicated",
			focVerifiedAt: new Date(),
		};

		await expect(resolveCiphertextDownloadUrl(pieceCid)).resolves.toBe(
			presignUrl,
		);
	});

	test("prefers FOC CDN when TEST_FOC and replicated even if R2 exists", async () => {
		testFoc = true;
		bucketExists = true;
		focRow = {
			replicateStatus: "replicated",
			focVerifiedAt: new Date(),
		};

		await expect(resolveCiphertextDownloadUrl(pieceCid)).resolves.toBe(
			focCdnUrl,
		);
	});

	test("falls back to FOC CDN when R2 missing and replicated", async () => {
		bucketExists = false;
		focRow = {
			replicateStatus: "replicated",
			focVerifiedAt: new Date(),
		};

		await expect(resolveCiphertextDownloadUrl(pieceCid)).resolves.toBe(
			focCdnUrl,
		);
	});

	test("throws when neither R2 nor replicated FOC", async () => {
		bucketExists = false;
		focRow = null;

		await expect(resolveCiphertextDownloadUrl(pieceCid)).rejects.toThrow();
	});
});
