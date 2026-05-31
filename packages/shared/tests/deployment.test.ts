import { describe, expect, test } from "bun:test";
import {
	assertDeploymentChain,
	dodoLive,
	requiredChainForDeployment,
	sandboxEntitlementsOpen,
	signupPolicyIsGated,
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

	test("dodo and entitlements flags", () => {
		expect(dodoLive("local")).toBe(false);
		expect(dodoLive("staging")).toBe(false);
		expect(dodoLive("sandbox")).toBe(false);
		expect(dodoLive("production")).toBe(true);
		expect(sandboxEntitlementsOpen("sandbox")).toBe(true);
		expect(sandboxEntitlementsOpen("staging")).toBe(false);
	});

	test("signupPolicyIsGated only on production", () => {
		expect(signupPolicyIsGated("production")).toBe(true);
		expect(signupPolicyIsGated("local")).toBe(false);
		expect(signupPolicyIsGated("staging")).toBe(false);
		expect(signupPolicyIsGated("sandbox")).toBe(false);
	});
});
