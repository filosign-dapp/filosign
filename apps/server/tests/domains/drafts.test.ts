import { describe, expect, test } from "bun:test";
import {
	assertDraftDocumentsExistOnS3,
	assertDraftSnapshotExistsOnS3,
	type DraftStorageProbe,
} from "@/lib/domains/drafts/utils/verify-draft-storage";

function probeWith(keys: Set<string>): DraftStorageProbe {
	return {
		exists: async (key) => keys.has(key),
	};
}

describe("assertDraftDocumentsExistOnS3", () => {
	test("passes when all document keys exist", async () => {
		const keys = new Set(["drafts/org-1/draft-1/doc-a.bin"]);
		await assertDraftDocumentsExistOnS3({
			draftId: "draft-1",
			organizationId: "org-1",
			docIds: ["doc-a"],
			probe: probeWith(keys),
		});
	});

	test("throws PRECONDITION_FAILED when a document key is missing", async () => {
		await expect(
			assertDraftDocumentsExistOnS3({
				draftId: "draft-1",
				organizationId: "org-1",
				docIds: ["doc-missing"],
				probe: probeWith(new Set()),
			}),
		).rejects.toMatchObject({
			code: "PRECONDITION_FAILED",
		});
	});
});

describe("assertDraftSnapshotExistsOnS3", () => {
	test("throws when snapshot key is missing", async () => {
		await expect(
			assertDraftSnapshotExistsOnS3({
				draftId: "draft-1",
				organizationId: "org-1",
				probe: probeWith(new Set()),
			}),
		).rejects.toMatchObject({
			code: "PRECONDITION_FAILED",
		});
	});
});
