import { beforeAll, describe, expect, mock, test } from "bun:test";
import { resolve } from "node:path";
import {
	ACTIVE_PILOT_ADDENDUM_SHA256,
	ACTIVE_PRIVACY_SHA256,
	ACTIVE_PRIVACY_VERSION,
	ACTIVE_TERMS_SHA256,
	ACTIVE_TERMS_VERSION,
} from "@filosign/shared";
import { getAddress } from "viem";
import type { OrpcContext } from "@/api/orpc/context";
import realSchema from "@/lib/platform/db/schema";
import { dbQueryResult } from "../support/db-query-result";
import { testEnvStub } from "../support/env-stub";

const wallet = getAddress("0x1111111111111111111111111111111111111111");
const staleTermsSha256 = "c".repeat(64);

let selectUsersResult: unknown[] = [];
let selectReceiptsResult: unknown[] = [];
let selectPilotAddendumReceiptsResult: unknown[] = [];
let selectPartnerTrialRedemptionsResult: unknown[] = [];
let insertedRows: unknown[] = [];

mock.module("@/env", () => ({ default: testEnvStub }));

mock.module("@/lib/platform/db", () => ({
	default: {
		schema: realSchema,
		select: (_fields: unknown) => {
			return {
				from: (table: unknown) => {
					const whereHandler = (_condition: unknown) => {
						if (table === realSchema.users) {
							return dbQueryResult(selectUsersResult);
						}
						if (table === realSchema.termsAcceptanceReceipts) {
							return dbQueryResult(selectReceiptsResult);
						}
						if (table === realSchema.pilotAddendumAcceptanceReceipts) {
							return dbQueryResult(selectPilotAddendumReceiptsResult);
						}
						return dbQueryResult([]);
					};
					return {
						innerJoin: () => ({
							where: () => dbQueryResult(selectPartnerTrialRedemptionsResult),
						}),
						where: whereHandler,
					};
				},
			};
		},
		insert: (table: unknown) => {
			return {
				values: (values: unknown) => {
					if (table === realSchema.termsAcceptanceReceipts) {
						insertedRows.push(values);
					}
					if (table === realSchema.pilotAddendumAcceptanceReceipts) {
						insertedRows.push(values);
					}
					return Promise.resolve(insertedRows);
				},
			};
		},
	},
}));

mock.module("@/lib/domains/users/signatures", () => ({
	userSignatureCreate: async () => {},
	userSignaturesList: async () => {},
	userSignatureGetById: async () => {},
	zUserSignatureSetDefaultBody: require("zod").z.any(),
	userSignatureSetDefault: async () => {},
	userSignatureDelete: async () => {},
	defaultSignatureArtifactsForWallet: async () => ({
		signature: null,
		initial: null,
	}),
	copyArtifactToEnvelopeSnapshot: async () => {},
}));

mock.module("@/lib/platform/cache/session", () => ({
	getRedis: () => ({
		get: async () => null,
		setex: async () => {},
	}),
	initCache: async () => {},
	flushDevCache: async () => {},
	getCachedSession: async () => null,
	setCachedSession: async () => {},
	assertVerifyRateLimit: async () => {},
}));

describe("userProfileMe", () => {
	beforeAll(() => {
		selectUsersResult = [];
		selectReceiptsResult = [];
		selectPilotAddendumReceiptsResult = [];
		selectPartnerTrialRedemptionsResult = [];
	});

	test("returns user profile with needsTermsAcceptance true if no receipt found", async () => {
		selectUsersResult = [
			{
				walletAddress: wallet,
				encryptionPublicKey: "0xkey",
				keygenDataJson: null,
				createdAt: new Date(),
				email: "test@example.com",
				username: "tester",
				firstName: "Test",
				lastName: "User",
				avatarKey: null,
				authProviderId: "google-oauth2|123",
				defaultSignatureId: null,
				defaultInitialId: null,
			},
		];
		selectReceiptsResult = [];

		const { userProfileMe } = await import("@/lib/domains/users/profile");
		const result = await userProfileMe(wallet);

		expect(result.walletAddress).toBe(wallet);
		expect(result.username).toBe("tester");
		expect(result.needsTermsAcceptance).toBe(true);
		expect(result.needsPilotAddendumAcceptance).toBe(false);
	});

	test("returns user profile with needsTermsAcceptance false if matching receipt found", async () => {
		selectUsersResult = [
			{
				walletAddress: wallet,
				encryptionPublicKey: "0xkey",
				keygenDataJson: null,
				createdAt: new Date(),
				email: "test@example.com",
				username: "tester",
				firstName: "Test",
				lastName: "User",
				avatarKey: null,
				authProviderId: "google-oauth2|123",
				defaultSignatureId: null,
				defaultInitialId: null,
			},
		];
		selectReceiptsResult = [{ id: "receipt-1" }];

		const { userProfileMe } = await import("@/lib/domains/users/profile");
		const result = await userProfileMe(wallet);

		expect(result.walletAddress).toBe(wallet);
		expect(result.needsTermsAcceptance).toBe(false);
		expect(result.needsPilotAddendumAcceptance).toBe(false);
	});
});

describe("userAcceptTerms", () => {
	beforeAll(() => {
		insertedRows = [];
	});

	test("successfully inserts a receipt row when versions match", async () => {
		const { userAcceptTerms } = await import("@/lib/domains/users/profile");
		const mockHonoContext = {
			req: {
				header: (name: string) => (name === "user-agent" ? "TestAgent" : null),
			},
		};
		const mockContext = {
			hono: mockHonoContext,
		} as unknown as OrpcContext;

		const result = await userAcceptTerms(
			wallet,
			{
				acceptTerms: true,
				businessUseAttestation: true,
				termsVersion: ACTIVE_TERMS_VERSION,
				privacyVersion: ACTIVE_PRIVACY_VERSION,
				termsSha256: ACTIVE_TERMS_SHA256,
				privacySha256: ACTIVE_PRIVACY_SHA256,
			},
			mockContext,
		);

		expect(result).toEqual({});
		expect(insertedRows).toHaveLength(1);
		expect(insertedRows[0]).toMatchObject({
			walletAddress: wallet,
			termsVersion: ACTIVE_TERMS_VERSION,
			privacyVersion: ACTIVE_PRIVACY_VERSION,
			termsSha256: ACTIVE_TERMS_SHA256,
			privacySha256: ACTIVE_PRIVACY_SHA256,
			businessUseAttested: true,
			acceptanceAction: "clickwrap_reaccept",
			userAgent: "TestAgent",
		});
	});

	test("rejects a receipt without explicit assent", async () => {
		const { userAcceptTerms } = await import("@/lib/domains/users/profile");
		const mockContext = {
			hono: { req: { header: (_name: string) => null } },
		} as unknown as OrpcContext;

		expect(
			userAcceptTerms(
				wallet,
				{
					termsVersion: ACTIVE_TERMS_VERSION,
					privacyVersion: ACTIVE_PRIVACY_VERSION,
					termsSha256: ACTIVE_TERMS_SHA256,
					privacySha256: ACTIVE_PRIVACY_SHA256,
					businessUseAttestation: true,
				},
				mockContext,
			),
		).rejects.toThrow();
	});

	test("rejects a receipt for document content that is not current", async () => {
		const { userAcceptTerms } = await import("@/lib/domains/users/profile");
		const mockContext = {
			hono: { req: { header: (_name: string) => null } },
		} as unknown as OrpcContext;

		expect(
			userAcceptTerms(
				wallet,
				{
					acceptTerms: true,
					businessUseAttestation: true,
					termsVersion: ACTIVE_TERMS_VERSION,
					privacyVersion: ACTIVE_PRIVACY_VERSION,
					termsSha256: staleTermsSha256,
					privacySha256: ACTIVE_PRIVACY_SHA256,
				},
				mockContext,
			),
		).rejects.toThrow();
	});

	test("throws an error when terms version is invalid", async () => {
		const { userAcceptTerms } = await import("@/lib/domains/users/profile");
		const mockHonoContext = {
			req: {
				header: (_name: string) => null,
			},
		};
		const mockContext = {
			hono: mockHonoContext,
		} as unknown as OrpcContext;

		expect(
			userAcceptTerms(
				wallet,
				{
					acceptTerms: true,
					businessUseAttestation: true,
					termsVersion: "old-version",
					privacyVersion: ACTIVE_PRIVACY_VERSION,
					termsSha256: ACTIVE_TERMS_SHA256,
					privacySha256: ACTIVE_PRIVACY_SHA256,
				},
				mockContext,
			),
		).rejects.toThrow();
	});
});

describe("zUserRegisterBody", () => {
	test("requires explicit terms and business-use assent", async () => {
		const { zUserRegisterBody } = await import("@/api/handlers/users/register");
		const result = zUserRegisterBody.safeParse({
			saltPin: "0x01",
			saltSeed: "0x02",
			saltChallenge: "0x03",
			commitmentKem: "0x04",
			commitmentSig: "0x05",
			signature: "0x06",
			encryptionPublicKey: "0x07",
			signaturePublicKey: "0x08",
			walletAddress: wallet,
			idToken: "token",
			termsVersion: ACTIVE_TERMS_VERSION,
			privacyVersion: ACTIVE_PRIVACY_VERSION,
			termsSha256: ACTIVE_TERMS_SHA256,
			privacySha256: ACTIVE_PRIVACY_SHA256,
		});

		expect(result.success).toBe(false);
	});
});

describe("active legal artifacts", () => {
	test("hash constants match the exact published source bundle", async () => {
		const astroPages = resolve(
			import.meta.dir,
			"../../../../apps/astro/src/pages",
		);
		const termsSource = await Bun.file(
			resolve(astroPages, "terms.astro"),
		).text();
		const acceptableUseSource = await Bun.file(
			resolve(astroPages, "acceptable-use.astro"),
		).text();
		const privacySource = await Bun.file(
			resolve(astroPages, "privacy.astro"),
		).text();
		const pilotAddendumSource = await Bun.file(
			resolve(astroPages, "legal/design-partner-addendum.astro"),
		).text();
		const hash = (value: string) =>
			new Bun.CryptoHasher("sha256").update(value).digest("hex");

		expect(hash(`${termsSource}\n${acceptableUseSource}`)).toBe(
			ACTIVE_TERMS_SHA256,
		);
		expect(hash(privacySource)).toBe(ACTIVE_PRIVACY_SHA256);
		expect(hash(pilotAddendumSource)).toBe(ACTIVE_PILOT_ADDENDUM_SHA256);
	});
});
