import { describe, expect, test } from "bun:test";
import { shouldEnforceSendQuota } from "@/lib/domains/users/activation-quota";

describe("shouldEnforceSendQuota", () => {
	test("practice envelopes skip quota enforcement", () => {
		expect(shouldEnforceSendQuota(true)).toBe(false);
	});

	test("real envelopes enforce quota", () => {
		expect(shouldEnforceSendQuota(false)).toBe(true);
		expect(shouldEnforceSendQuota(undefined)).toBe(true);
	});
});
