import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "../../../..");

describe("files.piece.detail registry routing", () => {
	test("selects registryAddress from the files row", () => {
		const src = readFileSync(
			join(repoRoot, "apps/server/lib/domains/files/utils/piece-detail.ts"),
			"utf8",
		);
		expect(src).toContain("registryAddress: files.registryAddress");
	});

	test("output schema exposes registryAddress", () => {
		const src = readFileSync(
			join(repoRoot, "apps/server/api/orpc/schemas/files-piece-output.ts"),
			"utf8",
		);
		expect(src).toContain("registryAddress: zHexString()");
	});
});

describe("sign and ack EIP-712 verifyingContract", () => {
	test("useSignFile signs against envelopeRegistryAt(registryAddress)", () => {
		const src = readFileSync(
			join(repoRoot, "packages/react-sdk/src/hooks/files/useSignFile.ts"),
			"utf8",
		);
		expect(src).toContain("envelopeRegistryAt(contracts, registryAddress)");
		expect(src).toContain("verifyingContract: registry.address");
	});

	test("useAckFile signs against envelopeRegistryAt(registryAddress)", () => {
		const src = readFileSync(
			join(repoRoot, "packages/react-sdk/src/hooks/files/useAckFile.ts"),
			"utf8",
		);
		expect(src).toContain("envelopeRegistryAt(contracts, registryAddress)");
		expect(src).toContain("verifyingContract: registry.address");
	});

	test("eip712signature supports per-registry verifyingContract override", () => {
		const src = readFileSync(
			join(repoRoot, "apps/contracts/services/utils.ts"),
			"utf8",
		);
		expect(src).toContain("options?: { verifyingContract?:");
		expect(src).toContain("options?.verifyingContract ??");
	});
});
