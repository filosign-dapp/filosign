import { describe, expect, test } from "bun:test";
import { signupPolicy, signupPolicyIsGated } from "@filosign/shared";

describe("signupPolicy", () => {
	test("production requires invite or paid setup", () => {
		expect(signupPolicy("production")).toBe("invite_or_paid");
		expect(signupPolicyIsGated("production")).toBe(true);
	});

	test("local, staging, and sandbox allow open signup", () => {
		for (const deployment of ["local", "staging", "sandbox"] as const) {
			expect(signupPolicy(deployment)).toBe("open");
			expect(signupPolicyIsGated(deployment)).toBe(false);
		}
	});
});
