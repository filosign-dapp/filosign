import { beforeEach, describe, expect, mock, test } from "bun:test";
import { getAddress, type Hash } from "viem";
import { dbQueryResult } from "../support/db-query-result";
import { testEnvStub } from "../support/env-stub";

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

mock.module("@/env", () => ({ default: testEnvStub }));

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

describe("register-helpers", () => {
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
