import type { FilosignRpcQueryUtils } from "@filosign/react";
import type { UserProfile } from "@filosign/react/users";
import type { PlacementField, UserSignatureArtifact } from "@filosign/shared";
import { defaultPlacementLayout, zPlacementManifest } from "@filosign/shared";

export const TEST_WALLET = "0x0000000000000000000000000000000000000001";
export const SAVED_SIGNATURE_ID = "550e8400-e29b-41d4-a716-446655440001";
export const GENERATED_SIGNATURE_ID = "550e8400-e29b-41d4-a716-446655440099";
export const TEST_SHA256_B = "b".repeat(64);
export const TEST_SHA256_A = "a".repeat(64);

export const selfSignProfile = {
	email: "me@example.com",
	firstName: "Ada",
	lastName: "Lovelace",
	defaultSignatureId: SAVED_SIGNATURE_ID,
	defaultInitialId: null,
} as UserProfile;

export function drawnSignatureArtifact(
	overrides: Partial<UserSignatureArtifact> = {},
): UserSignatureArtifact {
	return {
		id: SAVED_SIGNATURE_ID,
		walletAddress: TEST_WALLET,
		kind: "drawn",
		role: "signature",
		storageKey: "signatures/sig-1.png",
		contentType: "image/png",
		contentSha256: TEST_SHA256_B,
		typedMeta: null,
		intrinsicAspectRatio: 2.5,
		previewUrl: "https://example.com/sig-1.png",
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
		...overrides,
	};
}

export function generatedSignatureArtifact(): UserSignatureArtifact {
	return drawnSignatureArtifact({
		id: GENERATED_SIGNATURE_ID,
		storageKey: "signatures/generated.png",
		contentSha256: TEST_SHA256_A,
		previewUrl: null,
	});
}

export function selfSignManifest() {
	return zPlacementManifest.parse({
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
}

export function signatureOnlyManifest() {
	return zPlacementManifest.parse({
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
}

export function buildSelfSignRpcQuery(args: {
	manifest: unknown;
	signatures?: UserSignatureArtifact[];
}): FilosignRpcQueryUtils {
	const signatures = args.signatures ?? [];
	return {
		files: {
			piece: {
				detail: {
					call: async () => ({
						placementManifest: args.manifest,
					}),
				},
			},
		},
		users: {
			signatures: {
				list: {
					call: async () => ({ signatures }),
				},
			},
		},
	} as unknown as FilosignRpcQueryUtils;
}

export function placementLayout() {
	return defaultPlacementLayout();
}

export function manifestSignatureField(
	manifest: ReturnType<typeof selfSignManifest>,
): PlacementField {
	const field = manifest.fields.find((row) => row.id === "field-signature");
	if (!field) throw new Error("signature field missing from manifest fixture");
	return field;
}
