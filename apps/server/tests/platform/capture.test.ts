import { describe, expect, test } from "bun:test";
import { ORPCError } from "@orpc/server";
import { shouldCaptureServerException } from "@/lib/platform/analytics";

describe("shouldCaptureServerException", () => {
	test("captures plain Error", () => {
		expect(shouldCaptureServerException(new Error("boom"))).toBe(true);
	});

	test("skips BAD_REQUEST ORPCError", () => {
		expect(
			shouldCaptureServerException(
				new ORPCError("BAD_REQUEST", { message: "nope" }),
			),
		).toBe(false);
	});

	test("skips ORPCError with appCode", () => {
		expect(
			shouldCaptureServerException(
				new ORPCError("BAD_REQUEST", {
					message: "View required",
					data: { appCode: "SIGNING.VIEW_REQUIRED" },
				}),
			),
		).toBe(false);
	});

	test("captures INTERNAL_SERVER_ERROR without appCode", () => {
		expect(
			shouldCaptureServerException(
				new ORPCError("INTERNAL_SERVER_ERROR", { message: "db failed" }),
			),
		).toBe(true);
	});
});
