import { describe, expect, it } from "bun:test";
import {
	DRAFT_REVIEW_MISSING_CRYPTO_SEED,
	normalizeDraftReviewDecryptError,
} from "../src/hooks/drafts/useDraftReview";

describe("normalizeDraftReviewDecryptError", () => {
	it("maps missing seed to actionable code", () => {
		const err = normalizeDraftReviewDecryptError(
			new Error("No unlocked key seed found"),
		);
		expect(err.message).toBe(DRAFT_REVIEW_MISSING_CRYPTO_SEED);
	});

	it("maps OperationError DOMException to user message", () => {
		const err = normalizeDraftReviewDecryptError(
			new DOMException(
				"The operation failed for an operation-specific reason",
				"OperationError",
			),
		);
		expect(err.message).toContain("Could not decrypt this draft");
	});
});
