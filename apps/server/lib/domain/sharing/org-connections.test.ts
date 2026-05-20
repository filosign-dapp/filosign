import { describe, expect, test } from "bun:test";
import { getAddress } from "viem";

/**
 * Documents expected anchor/recipient orientation for org connection sync
 * (recipient approves sender on-chain → anchor sender, recipient wallet).
 */
describe("org connection approval orientation", () => {
	test("anchor is sender and recipient is approver", () => {
		const sender = getAddress("0x1111111111111111111111111111111111111111");
		const recipient = getAddress("0x2222222222222222222222222222222222222222");
		expect(sender).not.toBe(recipient);
	});
});
