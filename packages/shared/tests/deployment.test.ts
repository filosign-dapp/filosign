import { describe, expect, test } from "bun:test";
import {
	assertDeploymentChain,
	billingEnabled,
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
});
