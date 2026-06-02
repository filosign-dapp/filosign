import { beforeEach, describe, expect, mock, test } from "bun:test";

const deleteObjectMock = mock(async (_key: string) => {});
const updateReturnRowsMock = mock(async () => [{ id: "r1" }, { id: "r2" }]);
const selectRowsMock = mock(async () => [] as unknown[]);
const deleteDocsMock = mock(async () => []);

function makeQuery<T>(rows: T[]) {
	const withLimit = { rows } as {
		rows: T[];
		limit: (_n: number) => Promise<T[]>;
	};
	withLimit.limit = async () => rows;
	return withLimit;
}

mock.module("@/lib/platform/s3/client", () => ({
	bucket: { delete: deleteObjectMock },
}));

mock.module("@/lib/platform/db", () => ({
	default: {
		schema: {
			accessRequests: { id: "id", createdAt: "createdAt" },
			envelopeDrafts: {
				id: "id",
				status: "status",
				updatedAt: "updatedAt",
				headSnapshotS3Key: "headSnapshotS3Key",
			},
			envelopeDraftDocuments: {
				id: "id",
				draftId: "draftId",
				s3Key: "s3Key",
			},
		},
		update: () => ({
			set: () => ({
				where: () => ({
					returning: updateReturnRowsMock,
				}),
			}),
		}),
		select: () => ({
			from: () => ({
				where: () => makeQuery([]),
			}),
		}),
		delete: () => ({
			where: () => ({
				returning: deleteDocsMock,
			}),
		}),
	},
}));

describe("GDPR retention jobs", () => {
	beforeEach(() => {
		deleteObjectMock.mockClear();
		updateReturnRowsMock.mockClear();
		selectRowsMock.mockClear();
		deleteDocsMock.mockClear();
	});

	test("redacts access request pii rows", async () => {
		const { runRedactAccessRequestPiiJob } = await import(
			"@/lib/platform/cron/redact-access-request-pii"
		);
		const res = await runRedactAccessRequestPiiJob();
		expect(res.redacted).toBe(2);
	});

	test("purges sent draft blobs and documents", async () => {
		const { runPurgeSentDraftBlobsJob } = await import(
			"@/lib/platform/cron/purge-sent-draft-blobs"
		);
		const res = await runPurgeSentDraftBlobsJob();
		expect(res.processedDrafts).toBe(0);
		expect(res.deletedObjects).toBe(0);
		expect(res.removedDocumentRows).toBe(0);
		expect(deleteObjectMock).not.toHaveBeenCalled();
	});
});
