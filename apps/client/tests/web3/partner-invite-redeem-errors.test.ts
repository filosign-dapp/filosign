import { describe, expect, test } from "bun:test";
import {
	isPermanentPartnerInviteRedeemError,
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
	});

	test("network-style errors preserve gate for retry", () => {
		const error = new TypeError("Failed to fetch");
		expect(isPermanentPartnerInviteRedeemError(error)).toBe(false);
		expect(shouldPreservePartnerInviteGate(error)).toBe(true);
	});
});
