import { describe, expect, test } from "bun:test";
import { throwAppError } from "@filosign/errors/server";
import { ORPCError } from "@orpc/server";
import { shouldCaptureServerException } from "@/lib/platform/analytics";

describe("shouldCaptureServerException", () => {
	test("does not capture plain Error", () => {
		expect(shouldCaptureServerException(new Error("boom"))).toBe(false);
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

	test("skips throwAppError catalog codes", () => {
		expect(
			shouldCaptureServerException(
				(() => {
					try {
						throwAppError("SIGNING.NOT_REQUIRED");
					} catch (error) {
						return error;
					}
				})(),
			),
		).toBe(false);
	});

	test("skips FORBIDDEN ORPCError without appCode", () => {
		expect(
			shouldCaptureServerException(
				new ORPCError("FORBIDDEN", { message: "access denied" }),
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
