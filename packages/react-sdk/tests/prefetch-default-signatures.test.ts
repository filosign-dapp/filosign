import { describe, expect, test } from "bun:test";
import type { UserSignatureArtifact } from "@filosign/shared";
import { signatureRolesNeedingPrefetch } from "../src/lib/prefetch-default-signatures";

const baseArtifact = {
	walletAddress: "0xabc",
	kind: "typed" as const,
	storageKey: "k",
	contentType: "image/png",
	contentSha256: "a".repeat(64),
	typedMeta: { text: "A", fontId: "dancing-script" },
	intrinsicAspectRatio: 2,
	previewUrl: null,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

function artifact(
	overrides: Partial<UserSignatureArtifact> &
		Pick<UserSignatureArtifact, "id" | "role">,
): UserSignatureArtifact {
	return { ...baseArtifact, ...overrides };
}

describe("signatureRolesNeedingPrefetch", () => {
	test("returns both roles when library is empty", () => {
		expect(
			signatureRolesNeedingPrefetch(
				{
					firstName: "Ada",
					lastName: "Lovelace",
					defaultSignatureId: null,
					defaultInitialId: null,
				},
				[],
			),
		).toEqual(["signature", "initial"]);
	});

	test("skips roles that already resolve from defaults", () => {
		const signatures = [
			artifact({ id: "sig-1", role: "signature" }),
			artifact({ id: "init-1", role: "initial" }),
		];

		expect(
			signatureRolesNeedingPrefetch(
				{
					firstName: "Ada",
					lastName: "Lovelace",
					defaultSignatureId: "sig-1",
					defaultInitialId: "init-1",
				},
				signatures,
			),
		).toEqual([]);
	});

	test("requests only the missing role", () => {
		const signatures = [artifact({ id: "sig-1", role: "signature" })];

		expect(
			signatureRolesNeedingPrefetch(
				{
					firstName: "Ada",
					lastName: "Lovelace",
					defaultSignatureId: "sig-1",
					defaultInitialId: null,
				},
				signatures,
			),
		).toEqual(["initial"]);
	});
});
