import { beforeEach, describe, expect, mock, test } from "bun:test";
import { getAddress } from "viem";
import type { JobOutboxRow } from "@/lib/platform/jobs";

const sender = getAddress("0x1111111111111111111111111111111111111111");

const deliverMock = mock(async () => {});
const markProcessedMock = mock(async () => {});
const markFailedMock = mock(async () => {});

const listStaleMock = mock(
	async (_args: {
		olderThan: Date;
		limit: number;
	}): Promise<JobOutboxRow[]> => [],
);
const activeJobMock = mock(async () => false);
const enqueueClaimedMock = mock(async () => 0);

// Mock the email invites module
mock.module("@/lib/platform/email/invites", () => ({
	sendDocumentReceivedEmail: deliverMock,
	sendColdDocumentInviteEmail: deliverMock,
}));

// Mock the outbox db updates
mock.module("@/lib/platform/jobs/utils/outbox", () => {
	const { parseOutboxPayload } = require("@/lib/platform/jobs/utils/outbox");
	return {
		parseOutboxPayload,
		markOutboxProcessed: markProcessedMock,
		markOutboxFailed: markFailedMock,
		listStaleUnprocessedOutbox: listStaleMock,
		enqueueClaimedOutboxRows: enqueueClaimedMock,
	};
});

// Mock the queues module
mock.module("@/lib/platform/jobs/queues", () => ({
	isEmailJobActive: activeJobMock,
}));

// Mock the database for email outbox fetch
let outboxRow: {
	id: string;
	kind: "doc_received";
	payload: Record<string, unknown>;
	processedAt: Date | null;
} | null = null;

mock.module("@/lib/platform/db", () => ({
	default: {
		select: () => ({
			from: () => ({
				where: () => ({
					limit: async () => (outboxRow ? [outboxRow] : []),
				}),
			}),
		}),
		schema: {
			jobOutbox: {},
		},
	},
}));

describe("outbox payload", () => {
	test("parses doc_received payload", async () => {
		const { parseOutboxPayload } = await import("@/lib/platform/jobs");
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
		const { processEmailOutboxJob } = await import("@/lib/platform/jobs");
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
		const { processEmailOutboxJob } = await import("@/lib/platform/jobs");
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
		const staleRow: JobOutboxRow = {
			id: "o1",
			kind: "doc_received",
			idempotencyKey: "key-1",
			payload: {},
			createdAt: new Date(0),
			processedAt: null,
			lastError: null,
		};

		listStaleMock.mockImplementation(async () => [staleRow]);
		activeJobMock.mockImplementation(async () => true);
		enqueueClaimedMock.mockClear();

		const { runOutboxSweeperJob } = await import(
			"@/lib/platform/cron/outbox-sweeper"
		);
		const enqueued = await runOutboxSweeperJob();
		expect(enqueued).toBe(0);
		expect(enqueueClaimedMock).not.toHaveBeenCalled();
	});
});
