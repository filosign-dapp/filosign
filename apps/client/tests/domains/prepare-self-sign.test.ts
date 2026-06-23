import "../support/mock-ensure-default-signature.ts";
import { beforeEach, describe, expect, it } from "bun:test";
import { prepareSelfSignCompletions } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send/prepare-self-sign";
import {
	ensureDefaultMock,
	resetEnsureDefaultMock,
} from "../support/mock-ensure-default-signature.ts";
import {
	buildSelfSignRpcQuery,
	drawnSignatureArtifact,
	generatedSignatureArtifact,
	selfSignManifest,
	selfSignProfile,
	signatureOnlyManifest,
} from "../support/signature-provisioning-fixtures";

describe("prepareSelfSignCompletions", () => {
	beforeEach(() => {
		resetEnsureDefaultMock();
	});

	it("builds visual and auto field completions from profile and signatures", async () => {
		const manifest = selfSignManifest();
		const artifact = drawnSignatureArtifact();

		const result = await prepareSelfSignCompletions({
			pieceCid: "bafytest",
			selfFieldIds: ["field-signature", "field-date"],
			selfProfile: selfSignProfile,
			signatures: [artifact],
			rpcQuery: buildSelfSignRpcQuery({ manifest, signatures: [artifact] }),
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
		const manifest = signatureOnlyManifest();
		const generated = generatedSignatureArtifact();

		const result = await prepareSelfSignCompletions({
			pieceCid: "bafytest",
			selfFieldIds: ["field-signature"],
			selfProfile: { ...selfSignProfile, defaultSignatureId: null },
			signatures: [],
			rpcQuery: buildSelfSignRpcQuery({ manifest, signatures: [generated] }),
		});

		expect(ensureDefaultMock).toHaveBeenCalledTimes(1);
		expect(result.fieldCompletions["field-signature"]?.storageKey).toBe(
			"signatures/generated.png",
		);
	});

	it("throws when the placement manifest is unavailable", async () => {
		await expect(
			prepareSelfSignCompletions({
				pieceCid: "bafytest",
				selfFieldIds: ["field-signature"],
				selfProfile: selfSignProfile,
				signatures: [drawnSignatureArtifact()],
				rpcQuery: buildSelfSignRpcQuery({ manifest: null }),
			}),
		).rejects.toThrow("Document manifest unavailable");
	});

	it("throws when no assigned self fields are found", async () => {
		const manifest = selfSignManifest();

		await expect(
			prepareSelfSignCompletions({
				pieceCid: "bafytest",
				selfFieldIds: ["missing-field"],
				selfProfile: selfSignProfile,
				signatures: [drawnSignatureArtifact()],
				rpcQuery: buildSelfSignRpcQuery({ manifest }),
			}),
		).rejects.toThrow("No assigned fields found for self-signing.");
	});
});
