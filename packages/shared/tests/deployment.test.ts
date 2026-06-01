import { describe, expect, test } from "bun:test";
import {
	allowedChainsForDeployment,
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

	test("assertDeploymentChain allows production on mainnet or testnet", () => {
		expect(() =>
			assertDeploymentChain({ deployment: "production", chain: "testnet" }),
		).not.toThrow();
		expect(() =>
			assertDeploymentChain({ deployment: "production", chain: "mainnet" }),
		).not.toThrow();
		expect(allowedChainsForDeployment("production")).toEqual([
			"mainnet",
			"testnet",
		]);
	});

	test("assertDeploymentChain rejects disallowed chain", () => {
		expect(() =>
			assertDeploymentChain({ deployment: "staging", chain: "mainnet" }),
		).toThrow(/requires CHAIN in \(testnet\)/);
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
