import { describe, expect, test } from "bun:test";
import { hashAuthSubjectCommitment } from "..";

describe("hashAuthSubjectCommitment", () => {
	test("stable for same id", () => {
		const id = "did:thirdweb:abc";
		expect(hashAuthSubjectCommitment(id)).toBe(hashAuthSubjectCommitment(id));
	});

	test("trims input", () => {
		const id = "did:thirdweb:abc";
		expect(hashAuthSubjectCommitment(`  ${id}  `)).toBe(
			hashAuthSubjectCommitment(id),
		);
	});

	test("rejects empty", () => {
		expect(() => hashAuthSubjectCommitment("")).toThrow(
			"authProviderId is required",
		);
	});
});
