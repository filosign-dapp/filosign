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

const relayer = getAddress("0x3333333333333333333333333333333333333333");

const fileRows: { pieceCid: string; onchainTxHash: `0x${string}` }[] = [];
const stateRows: Array<Record<string, unknown>> = [];
let selectRows: unknown[] = [];
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
				registrationStatus: "registrationStatus",
				registerError: "registerError",
			},
			fileRegisterStates: {
				pieceCid: "pieceCid",
				sender: "sender",
				registrationStatus: "registrationStatus",
				registerError: "registerError",
				registerAttemptedAt: "registerAttemptedAt",
				registerPayloadJson: "registerPayloadJson",
				assignedRelayerAddress: "assignedRelayerAddress",
				pendingTxHash: "pendingTxHash",
			},
		},
		insert: () => ({
			values: (row: Record<string, unknown>) => ({
				onConflictDoUpdate: () => {
					const existing = stateRows.find(
						(entry) => entry.pieceCid === row.pieceCid,
					);
					if (existing) {
						Object.assign(existing, row);
						return;
					}
					stateRows.push({ ...row });
				},
			}),
		}),
		select: () => ({
			from: () => ({
				where: () => ({
					limit: () => dbQueryResult(selectRows),
				}),
			}),
		}),
		update: () => ({
			set: () => ({
				where: async () => {},
			}),
		}),
		delete: () => ({
			where: async () => {},
		}),
	},
}));

mock.module("@/lib/platform/evm", () => ({
	routeRelayerForNewPiece: () => ({
		address: relayer,
		privateKey: "0x01",
		index: 0,
	}),
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

describe("register domain", () => {
	beforeEach(() => {
		fileRows.length = 0;
		stateRows.length = 0;
		selectRows = fileRows;
		registrationTimestamp = 0;
		logs = [];
		cidReadFails = false;
		logsReadFails = false;
	});

	describe("findRegisteredFileByPieceCid", () => {
		test("returns persisted row when pieceCid already exists", async () => {
			fileRows.push({ pieceCid, onchainTxHash: recoveredHash });
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

	describe("register-state", () => {
		test("upsertQueuedState stores queued status and relayer pin", async () => {
			selectRows = stateRows;
			const { upsertQueuedState, getRegisterState } = await import(
				"@/lib/domains/files/utils/register-state"
			);

			await upsertQueuedState({
				pieceCid: "bafyqueued",
				sender,
				assignedRelayerAddress: relayer,
				payload: {
					sender,
					rawBody: {},
					activeOrg: {
						organizationId: "00000000-0000-4000-8000-000000000001",
						role: "owner",
						encryptionPublicKey: `0x${"aa".repeat(32)}`,
						signingMode: "acting_member",
					},
				},
			});

			const row = await getRegisterState("bafyqueued");
			expect(row?.registrationStatus).toBe("queued");
			expect(row?.assignedRelayerAddress).toBe(relayer);
		});
	});
});
