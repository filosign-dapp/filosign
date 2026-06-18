import { describe, expect, test } from "bun:test";
import {
	isPartnerInviteEmailMismatchError,
	isPermanentPartnerInviteRedeemError,
	shouldClearAccessGateAfterPartnerRedeemError,
	shouldPreservePartnerInviteGate,
} from "@/src/lib/web3/partner-invite-redeem-errors";

describe("partner invite redeem errors", () => {
	test("permanent ORPC app codes do not preserve gate", () => {
		const error = {
			code: "FORBIDDEN",
			message: "blocked",
			data: {
				appCode: "WORKSPACE.PLATFORM_INVITE_PAID_PLAN_BLOCKS",
			},
		};

		expect(isPermanentPartnerInviteRedeemError(error)).toBe(true);
		expect(shouldPreservePartnerInviteGate(error)).toBe(false);
		expect(shouldClearAccessGateAfterPartnerRedeemError(error)).toBe(true);
	});

	test("email mismatch preserves gate for switch-account retry", () => {
		const error = {
			code: "FORBIDDEN",
			message: "mismatch",
			data: {
				appCode: "WORKSPACE.PLATFORM_EMAIL_MISMATCH",
			},
		};

		expect(isPartnerInviteEmailMismatchError(error)).toBe(true);
		expect(isPermanentPartnerInviteRedeemError(error)).toBe(true);
		expect(shouldPreservePartnerInviteGate(error)).toBe(true);
		expect(shouldClearAccessGateAfterPartnerRedeemError(error)).toBe(false);
	});

	test("network-style errors preserve gate for retry", () => {
		const error = new TypeError("Failed to fetch");
		expect(isPermanentPartnerInviteRedeemError(error)).toBe(false);
		expect(shouldPreservePartnerInviteGate(error)).toBe(true);
		expect(shouldClearAccessGateAfterPartnerRedeemError(error)).toBe(false);
	});
});
