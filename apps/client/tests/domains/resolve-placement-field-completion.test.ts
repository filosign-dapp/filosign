import "../support/mock-ensure-default-signature.ts";
import { beforeEach, describe, expect, it } from "bun:test";
import type { FilosignRpcQueryUtils } from "@filosign/react";
import { resolvePlacementFieldCompletion } from "@/src/routes/dashboard/document/sign/-lib/utils/resolve-placement-field-completion";
import {
	ensureDefaultMock,
	resetEnsureDefaultMock,
} from "../support/mock-ensure-default-signature.ts";
import {
	drawnSignatureArtifact,
	generatedSignatureArtifact,
	manifestSignatureField,
	placementLayout,
	selfSignManifest,
	selfSignProfile,
} from "../support/signature-provisioning-fixtures";

function buildResolverRpcQuery(
	signatures: ReturnType<typeof drawnSignatureArtifact>[],
): FilosignRpcQueryUtils {
	return {
		users: {
			signatures: {
				list: {
					call: async () => ({ signatures }),
				},
			},
		},
	} as unknown as FilosignRpcQueryUtils;
}

describe("resolvePlacementFieldCompletion", () => {
	beforeEach(() => {
		resetEnsureDefaultMock();
	});

	it("builds auto completion for date fields from profile", async () => {
		const manifest = selfSignManifest();
		const dateField = manifest.fields.find((row) => row.type === "date");
		if (!dateField) throw new Error("date field missing from manifest fixture");

		const completion = await resolvePlacementFieldCompletion({
			field: dateField,
			defaultArtifacts: { signature: null, initial: null },
			profile: selfSignProfile,
			layout: placementLayout(),
		});

		expect(completion?.valueKind).toBe("auto");
		expect(completion?.textValue).toBeTruthy();
	});

	it("uses cached drawn signature artifacts without provisioning", async () => {
		const manifest = selfSignManifest();
		const signatureField = manifestSignatureField(manifest);
		const artifact = drawnSignatureArtifact();

		const completion = await resolvePlacementFieldCompletion({
			field: signatureField,
			defaultArtifacts: { signature: artifact, initial: null },
			profile: selfSignProfile,
			layout: placementLayout(),
			signatures: [artifact],
		});

		expect(completion?.valueKind).toBe("visual");
		expect(completion?.storageKey).toBe("signatures/sig-1.png");
		expect(ensureDefaultMock).not.toHaveBeenCalled();
	});

	it("provisions a default signature and reloads the library when none is cached", async () => {
		const manifest = selfSignManifest();
		const signatureField = manifestSignatureField(manifest);
		const generated = generatedSignatureArtifact();

		const completion = await resolvePlacementFieldCompletion({
			field: signatureField,
			defaultArtifacts: { signature: null, initial: null },
			profile: { ...selfSignProfile, defaultSignatureId: null },
			layout: placementLayout(),
			rpcQuery: buildResolverRpcQuery([generated]),
			signatures: [],
		});

		expect(ensureDefaultMock).toHaveBeenCalledTimes(1);
		expect(completion?.valueKind).toBe("visual");
		expect(completion?.storageKey).toBe("signatures/generated.png");
	});
});
