import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	mock,
	test,
} from "bun:test";
import { getAddress, type Hash } from "viem";
import { dbQueryResult } from "../support/db-query-result";
import { restoreTestEnvMock } from "../support/env-stub";

const sender = getAddress("0x1111111111111111111111111111111111111111");
const pieceCid = "bafyREGISTER";
const cidId = `0x${"aa".repeat(32)}` as `0x${string}`;
const recoveredHash = `0x${"bb".repeat(32)}` as Hash;
const registryAddress = getAddress(
	"0x2222222222222222222222222222222222222222",
);

let fileRows: { pieceCid: string; onchainTxHash: `0x${string}` }[] = [];
let registrationTimestamp = 0;
let logs: { transactionHash: Hash }[] = [];
let cidReadFails = false;
let logsReadFails = false;

describe("register-helpers", () => {
	beforeAll(() => {
		mock.module("@/lib/platform/db", () => ({
			default: {
				schema: {
					files: {
						pieceCid: "pieceCid",
						onchainTxHash: "onchainTxHash",
					},
				},
				select: () => ({
					from: () => ({
						where: () => ({
							limit: () => dbQueryResult(fileRows),
						}),
					}),
				}),
			},
		}));

		mock.module("@/lib/platform/evm", () => ({
			fsContracts: {
				FSEnvelopeRegistry: {
					address: registryAddress,
					read: {
						cidIdentifier: async () => {
							if (cidReadFails) {
								throw new Error("rpc down");
							}
							return cidId;
						},
						envelopeRegistrations: async () => ({
							timestamp: registrationTimestamp,
						}),
					},
				},
			},
			evmClient: {
				getLogs: async () => {
					if (logsReadFails) {
						throw new Error("logs unavailable");
					}
					return logs;
				},
			},
		}));
	});

	afterAll(() => {
		mock.restore();
		restoreTestEnvMock();
	});

	beforeEach(() => {
		fileRows = [];
		registrationTimestamp = 0;
		logs = [];
		cidReadFails = false;
		logsReadFails = false;
	});

	describe("findRegisteredFileByPieceCid", () => {
		test("returns persisted row when pieceCid already exists", async () => {
			fileRows = [{ pieceCid, onchainTxHash: recoveredHash }];
			const { findRegisteredFileByPieceCid } = await import(
				"@/lib/domains/files/utils/register-helpers"
			);

			await expect(findRegisteredFileByPieceCid(pieceCid)).resolves.toEqual({
				pieceCid,
				onchainTxHash: recoveredHash,
			});
		});

		test("returns null when pieceCid is not in the database", async () => {
			const { findRegisteredFileByPieceCid } = await import(
				"@/lib/domains/files/utils/register-helpers"
			);

			await expect(findRegisteredFileByPieceCid(pieceCid)).resolves.toBeNull();
		});
	});

	describe("recoverRegisterEnvelopeTxHash", () => {
		test("returns null when envelope is not registered on chain", async () => {
			registrationTimestamp = 0;
			const { recoverRegisterEnvelopeTxHash } = await import(
				"@/lib/domains/files/utils/register-helpers"
			);

			await expect(
				recoverRegisterEnvelopeTxHash({ pieceCid, sender }),
			).resolves.toBeNull();
		});

		test("returns tx hash from EnvelopeRegistered log when chain has registration", async () => {
			registrationTimestamp = 1_700_000_000;
			logs = [{ transactionHash: recoveredHash }];
			const { recoverRegisterEnvelopeTxHash } = await import(
				"@/lib/domains/files/utils/register-helpers"
			);

			await expect(
				recoverRegisterEnvelopeTxHash({ pieceCid, sender }),
			).resolves.toBe(recoveredHash);
		});

		test("returns null when registration exists but no matching log is found", async () => {
			registrationTimestamp = 1_700_000_000;
			logs = [];
			const { recoverRegisterEnvelopeTxHash } = await import(
				"@/lib/domains/files/utils/register-helpers"
			);

			await expect(
				recoverRegisterEnvelopeTxHash({ pieceCid, sender }),
			).resolves.toBeNull();
		});

		test("returns null when cidIdentifier read fails", async () => {
			cidReadFails = true;
			const { recoverRegisterEnvelopeTxHash } = await import(
				"@/lib/domains/files/utils/register-helpers"
			);

			await expect(
				recoverRegisterEnvelopeTxHash({ pieceCid, sender }),
			).resolves.toBeNull();
		});

		test("returns null when log lookup fails", async () => {
			registrationTimestamp = 1_700_000_000;
			logsReadFails = true;
			const { recoverRegisterEnvelopeTxHash } = await import(
				"@/lib/domains/files/utils/register-helpers"
			);

			await expect(
				recoverRegisterEnvelopeTxHash({ pieceCid, sender }),
			).resolves.toBeNull();
		});
	});
});

describe("filesRegister idempotency", () => {
	beforeAll(() => {
		mock.module("@/lib/domains/files/utils/register-helpers", () => ({
			findRegisteredFileByPieceCid: async () => ({
				pieceCid: "bafyexisting",
				onchainTxHash: `0x${"aa".repeat(32)}`,
			}),
			recoverRegisterEnvelopeTxHash: async () => null,
			buildRegisterEmailOutboxRows: async () => {
				throw new Error("buildRegisterEmailOutboxRows must not run");
			},
			persistRegisteredFileInTx: async () => {
				throw new Error("persistRegisteredFileInTx must not run");
			},
			resolveRegisterRoutingCalldata: () => {
				throw new Error("resolveRegisterRoutingCalldata must not run");
			},
			trackRegisterAnalytics: () => {
				throw new Error("trackRegisterAnalytics must not run");
			},
		}));
	});

	afterAll(() => {
		mock.restore();
		restoreTestEnvMock();
	});

	test("returns early without downstream register work when pieceCid is already persisted", async () => {
		const { zPlacementManifest } = await import("@filosign/shared");
		const hex32 = `0x${"ab".repeat(32)}` as const;
		const hex65 = `0x${"00".repeat(65)}` as const;
		const minimalManifest = zPlacementManifest.parse({
			version: 1,
			documents: [
				{
					id: "doc1",
					name: "contract.pdf",
					sha256Plaintext: hex32,
					pageCount: 1,
				},
			],
			fields: [
				{
					id: "f1",
					documentId: "doc1",
					pageIndex: 0,
					rect: { x: 0.1, y: 0.2, width: 0.3, height: 0.05 },
					assignedRecipientEmail: "signer@example.com",
					required: true,
					type: "signature",
				},
			],
		});
		const registerBody = {
			pieceCid: "bafyexisting",
			participants: [],
			signature: hex65,
			senderEncryptedEncryptionKey: hex32,
			senderKemCiphertext: hex32,
			timestamp: 1_700_000_000,
			placementCommitment: hex32,
			documentSha256: hex32,
			placementManifest: minimalManifest,
			organizationId: "00000000-0000-7000-8000-000000000001",
			orgKemCiphertext: hex32,
			orgEncryptedEncryptionKey: hex32,
			displayName: "contract.pdf",
			mimeType: "application/pdf",
			ciphertextByteLength: 1024,
		};

		const { filesRegister } = await import("@/lib/domains/files/register");
		const result = await filesRegister(
			getAddress("0x1111111111111111111111111111111111111111"),
			registerBody,
		);

		expect(result).toEqual({});
	});
});
