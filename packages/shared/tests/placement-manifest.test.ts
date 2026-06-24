import { describe, expect, it } from "bun:test";
import {
	canonicalPlacementManifestJson,
	computePlacementCommitment,
	findSignerEmailMissingRequiredSignatureField,
	recipientHasRequiredSignatureField,
	validateSignerSignatureFieldsForSend,
	zPlacementManifest,
} from "..";

const minimalManifest = zPlacementManifest.parse({
	version: 1,
	documents: [
		{
			id: "doc1",
			name: "contract.pdf",
			sha256Plaintext: `0x${"ab".repeat(32)}`,
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

describe("computePlacementCommitment", () => {
	it("is stable across repeated canonical serialization", () => {
		const c1 = computePlacementCommitment(minimalManifest);
		const c2 = computePlacementCommitment(minimalManifest);
		expect(c1).toBe(c2);
	});

	it("canonical JSON key order does not affect commitment", () => {
		const raw = JSON.parse(canonicalPlacementManifestJson(minimalManifest));
		const commitment = computePlacementCommitment(minimalManifest);
		const permuted = {
			fields: raw.fields,
			documents: raw.documents,
			version: raw.version,
		};
		const recommit = computePlacementCommitment(
			zPlacementManifest.parse(permuted),
		);
		expect(recommit).toBe(commitment);
	});
});

describe("signer signature field policy", () => {
	const fields = minimalManifest.fields;

	it("accepts a required signature field per signer", () => {
		expect(
			recipientHasRequiredSignatureField(fields, "signer@example.com"),
		).toBe(true);
		expect(
			findSignerEmailMissingRequiredSignatureField(fields, [
				"signer@example.com",
			]),
		).toBeNull();
		expect(
			validateSignerSignatureFieldsForSend(minimalManifest, [
				"signer@example.com",
			]),
		).toBeNull();
	});

	it("rejects initial-only placement", () => {
		const manifest = zPlacementManifest.parse({
			...minimalManifest,
			fields: [
				{
					...minimalManifest.fields[0],
					type: "initial",
				},
			],
		});
		expect(
			findSignerEmailMissingRequiredSignatureField(manifest.fields, [
				"signer@example.com",
			]),
		).toBe("signer@example.com");
	});

	it("rejects optional signature fields", () => {
		const manifest = zPlacementManifest.parse({
			...minimalManifest,
			fields: [
				{
					...minimalManifest.fields[0],
					required: false,
				},
			],
		});
		expect(
			recipientHasRequiredSignatureField(manifest.fields, "signer@example.com"),
		).toBe(false);
	});
});
