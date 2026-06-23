import { mock } from "bun:test";
import {
	GENERATED_SIGNATURE_ID,
	TEST_SHA256_A,
} from "./signature-provisioning-fixtures";

export const ensureDefaultMock = mock(async () => ({
	id: GENERATED_SIGNATURE_ID,
	storageKey: "signatures/generated.png",
	contentSha256: TEST_SHA256_A,
	previewUrl: null,
}));

mock.module(
	"../../../../packages/react-sdk/src/lib/ensure-default-signature-artifact.ts",
	() => ({
		ensureDefaultTypedSignatureArtifact: ensureDefaultMock,
	}),
);

export function resetEnsureDefaultMock() {
	ensureDefaultMock.mockReset();
	ensureDefaultMock.mockImplementation(async () => ({
		id: GENERATED_SIGNATURE_ID,
		storageKey: "signatures/generated.png",
		contentSha256: TEST_SHA256_A,
		previewUrl: null,
	}));
}

resetEnsureDefaultMock();
