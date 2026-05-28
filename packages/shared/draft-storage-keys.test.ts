import { expect, test } from "bun:test";
import { draftDocumentKey, draftSnapshotKey } from "./draft-storage-keys";

test("draftSnapshotKey uses scope personal when organizationId is null", () => {
	const key = draftSnapshotKey({
		draftId: "123",
		organizationId: null,
	});
	expect(key).toBe("drafts/personal/123/snapshot.bin");
});

test("draftSnapshotKey uses organizationId for scope when provided", () => {
	const key = draftSnapshotKey({
		draftId: "123",
		organizationId: "org_abc",
	});
	expect(key).toBe("drafts/org_abc/123/snapshot.bin");
});

test("draftDocumentKey calculates correct path", () => {
	const key = draftDocumentKey({
		draftId: "123",
		organizationId: "org_abc",
		docId: "doc_xyz",
	});
	expect(key).toBe("drafts/org_abc/123/doc_xyz.bin");
});
