import { describe, expect, it, mock } from "bun:test";
import type { FilosignRpcQueryUtils } from "@filosign/react";
import type { UserProfile } from "@filosign/react/users";
import type { UserSignatureArtifact } from "@filosign/shared";
import { zPlacementManifest } from "@filosign/shared";

const ensureDefaultMock = mock(async () => ({
	id: "generated-sig",
	storageKey: "signatures/generated.png",
	contentSha256: `0x${"a".repeat(64)}`,
	previewUrl: null,
}));

mock.module("@filosign/react/users", () => ({
	ensureDefaultTypedSignatureArtifact: ensureDefaultMock,
}));

const { prepareSelfSignCompletions } = await import(
	"../../src/routes/dashboard/envelope/create/add-sign/-lib/utils/send/prepare-self-sign"
);

const selfProfile = {
	email: "me@example.com",
	firstName: "Ada",
	lastName: "Lovelace",
	defaultSignatureId: "sig-1",
	defaultInitialId: null,
} as UserProfile;

const signatureArtifact: UserSignatureArtifact = {
	id: "sig-1",
	role: "signature",
	kind: "typed",
	storageKey: "signatures/sig-1.png",
	contentSha256: `0x${"b".repeat(64)}`,
	previewUrl: "https://example.com/sig-1.png",
	typedMeta: { text: "Ada Lovelace", fontId: "dancing-script" },
	intrinsicAspectRatio: 2.5,
	createdAt: new Date().toISOString(),
};

function buildRpcQuery(manifest: unknown): FilosignRpcQueryUtils {
	return {
		files: {
			piece: {
				detail: {
					call: async () => ({
						placementManifest: manifest,
					}),
				},
			},
		},
	} as unknown as FilosignRpcQueryUtils;
}

describe("prepareSelfSignCompletions", () => {
	it("builds visual and auto field completions from profile and signatures", async () => {
		const manifest = zPlacementManifest.parse({
			version: 1,
			documents: [
				{
					id: "doc-1",
					name: "contract.pdf",
					sha256Plaintext: `0x${"ab".repeat(32)}`,
					pageCount: 1,
				},
			],
			fields: [
				{
					id: "field-signature",
					type: "signature",
					documentId: "doc-1",
					pageIndex: 0,
					rect: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
					assignedRecipientEmail: "me@example.com",
					required: true,
				},
				{
					id: "field-date",
					type: "date",
					documentId: "doc-1",
					pageIndex: 0,
					rect: { x: 0.1, y: 0.2, width: 0.2, height: 0.05 },
					assignedRecipientEmail: "me@example.com",
					required: true,
				},
			],
		});

		const result = await prepareSelfSignCompletions({
			pieceCid: "bafytest",
			selfFieldIds: ["field-signature", "field-date"],
			selfProfile,
			signatures: [signatureArtifact],
			rpcQuery: buildRpcQuery(manifest),
		});

		expect(result.completedFieldIds).toEqual(["field-signature", "field-date"]);
		expect(result.fieldCompletions["field-signature"]?.valueKind).toBe(
			"visual",
		);
		expect(result.fieldCompletions["field-signature"]?.storageKey).toBe(
			"signatures/sig-1.png",
		);
		expect(result.fieldCompletions["field-date"]?.valueKind).toBe("auto");
		expect(result.fieldCompletions["field-date"]?.textValue).toBeTruthy();
		expect(ensureDefaultMock).not.toHaveBeenCalled();
	});

	it("provisions default signature artifact when none is saved", async () => {
		const manifest = zPlacementManifest.parse({
			version: 1,
			documents: [
				{
					id: "doc-1",
					name: "contract.pdf",
					sha256Plaintext: `0x${"ab".repeat(32)}`,
					pageCount: 1,
				},
			],
			fields: [
				{
					id: "field-signature",
					type: "signature",
					documentId: "doc-1",
					pageIndex: 0,
					rect: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
					assignedRecipientEmail: "me@example.com",
					required: true,
				},
			],
		});

		const result = await prepareSelfSignCompletions({
			pieceCid: "bafytest",
			selfFieldIds: ["field-signature"],
			selfProfile: { ...selfProfile, defaultSignatureId: null },
			signatures: [],
			rpcQuery: buildRpcQuery(manifest),
		});

		expect(ensureDefaultMock).toHaveBeenCalledTimes(1);
		expect(result.fieldCompletions["field-signature"]?.storageKey).toBe(
			"signatures/generated.png",
		);
	});
});
