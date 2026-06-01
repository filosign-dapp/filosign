import { describe, expect, test } from "bun:test";
import { isValidationOrpcError } from "../src/is-validation-orpc-error";

describe("isValidationOrpcError", () => {
	test("true for issues payload", () => {
		expect(
			isValidationOrpcError({
				code: "BAD_REQUEST",
				message: "Invalid input",
				data: { issues: [{ path: ["email"] }] },
			}),
		).toBe(true);
	});

	test("false for business signing message", () => {
		expect(
			isValidationOrpcError({
				code: "BAD_REQUEST",
				message: "All required fields must be marked complete before signing",
			}),
		).toBe(false);
	});
});
