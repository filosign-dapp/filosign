import { beforeEach, describe, expect, mock, test } from "bun:test";
import { getAddress } from "viem";

const sender = getAddress("0x1111111111111111111111111111111111111111");

describe("outbox payload", () => {
	test("parses doc_received payload", async () => {
		const { parseOutboxPayload } = await import(
			"@/lib/platform/jobs/outbox-payload"
		);
		const parsed = parseOutboxPayload("doc_received", {
			to: "a@b.com",
			senderWallet: sender,
			pieceCid: "cid",
			senderName: "Alice",
		});
		expect(parsed.to).toBe("a@b.com");
		expect(parsed.senderWallet).toBe(sender);
	});
});

describe("processEmailOutboxJob", () => {
	const deliverMock = mock(async () => {});
	const markProcessedMock = mock(async () => {});
	const markFailedMock = mock(async () => {});

	let outboxRow: {
		id: string;
		kind: "doc_received";
		payload: Record<string, unknown>;
		processedAt: Date | null;
	} | null;

	mock.module("@/lib/platform/jobs/process-email-from-outbox", () => ({
		processEmailFromOutbox: deliverMock,
	}));

	mock.module("@/lib/platform/jobs/outbox-store", () => ({
		markOutboxProcessed: markProcessedMock,
		markOutboxFailed: markFailedMock,
		listStaleUnprocessedOutbox: async () => [],
		claimOutboxBatch: async () => [],
		insertJobOutboxRows: async () => [],
		loadUnprocessedOutboxByIds: async () => [],
		pruneProcessedOutboxOlderThan: async () => 0,
	}));

	mock.module("@/lib/platform/db", () => ({
		default: {
			select: () => ({
				from: () => ({
					where: () => ({
						limit: async () => (outboxRow ? [outboxRow] : []),
					}),
				}),
			}),
		},
	}));

	beforeEach(() => {
		deliverMock.mockClear();
		markProcessedMock.mockClear();
		markFailedMock.mockClear();
		outboxRow = {
			id: "outbox-1",
			kind: "doc_received",
			payload: {
				to: "user@example.com",
				senderWallet: sender,
				pieceCid: "bafy",
			},
			processedAt: null,
		};
	});

	test("delivers then marks processed", async () => {
		const { processEmailOutboxJob } = await import(
			"@/lib/platform/jobs/process-email-outbox-job"
		);
		await processEmailOutboxJob({
			outboxId: "outbox-1",
			kind: "doc_received",
			idempotencyKey: "idem-1",
		});
		expect(deliverMock).toHaveBeenCalledTimes(1);
		expect(markProcessedMock).toHaveBeenCalledTimes(1);
	});

	test("skips delivery when already processed", async () => {
		if (!outboxRow) throw new Error("outbox fixture not initialized");
		outboxRow.processedAt = new Date();
		const { processEmailOutboxJob } = await import(
			"@/lib/platform/jobs/process-email-outbox-job"
		);
		await processEmailOutboxJob({
			outboxId: "outbox-1",
			kind: "doc_received",
			idempotencyKey: "idem-2",
		});
		expect(deliverMock).not.toHaveBeenCalled();
		expect(markProcessedMock).not.toHaveBeenCalled();
	});
});

describe("outbox sweeper", () => {
	test("does not enqueue when BullMQ job is active", async () => {
		const staleRow = {
			id: "o1",
			kind: "doc_received" as const,
			idempotencyKey: "key-1",
			payload: {},
			createdAt: new Date(0),
			processedAt: null,
			lastError: null,
		};

		mock.module("@/lib/platform/jobs/outbox-store", () => ({
			listStaleUnprocessedOutbox: async () => [staleRow],
		}));
		mock.module("@/lib/platform/jobs/email-queue", () => ({
			isEmailJobActive: async () => true,
		}));
		const enqueueMock = mock(async () => 0);
		mock.module("@/lib/platform/jobs/outbox-enqueue", () => ({
			enqueueClaimedOutboxRows: enqueueMock,
		}));

		const { runOutboxSweeperJob } = await import(
			"@/lib/platform/cron/outbox-sweeper"
		);
		const enqueued = await runOutboxSweeperJob();
		expect(enqueued).toBe(0);
		expect(enqueueMock).not.toHaveBeenCalled();
	});
});
