import { describe, expect, test } from "bun:test";
import {
	assertDeploymentChain,
	billingEnabled,
	devEntitlementsBypass,
	dodoLive,
	requiredChainForDeployment,
	sandboxEntitlementsOpen,
} from "../deployment";

describe("deployment policy", () => {
	test("requiredChainForDeployment", () => {
		expect(requiredChainForDeployment("local")).toBe("local");
		expect(requiredChainForDeployment("staging")).toBe("testnet");
		expect(requiredChainForDeployment("sandbox")).toBe("testnet");
		expect(requiredChainForDeployment("production")).toBe("mainnet");
	});

	test("assertDeploymentChain rejects mismatch", () => {
		expect(() =>
			assertDeploymentChain({ deployment: "production", chain: "testnet" }),
		).toThrow(/requires CHAIN=mainnet/);
	});

	test("billing and entitlements flags", () => {
		expect(billingEnabled("sandbox")).toBe(false);
		expect(billingEnabled("staging")).toBe(true);
		expect(billingEnabled("production")).toBe(true);
		expect(dodoLive("staging")).toBe(false);
		expect(dodoLive("production")).toBe(true);
		expect(sandboxEntitlementsOpen("sandbox")).toBe(true);
		expect(sandboxEntitlementsOpen("staging")).toBe(false);
	});

	test("devEntitlementsBypass for owner email on non-production only", () => {
		expect(devEntitlementsBypass("local", "kartik100100@gmail.com")).toBe(true);
		expect(devEntitlementsBypass("staging", "Kartik100100@gmail.com")).toBe(
			true,
		);
		expect(devEntitlementsBypass("production", "kartik100100@gmail.com")).toBe(
			false,
		);
		expect(devEntitlementsBypass("local", "other@example.com")).toBe(false);
	});
});
