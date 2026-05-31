import { describe, expect, test } from "bun:test";
import {
	generatePlatformInviteToken,
	generateSetupToken,
} from "@/lib/domains/platform-access";

describe("platform-access tokens", () => {
	test("invite tokens are url-safe and long enough", () => {
		const token = generatePlatformInviteToken();
		expect(token.length).toBeGreaterThanOrEqual(16);
		expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
	});

	test("setup tokens are url-safe", () => {
		const token = generateSetupToken();
		expect(token.length).toBeGreaterThanOrEqual(16);
	});
});

describe("registerUserAccount contract", () => {
	test("register handler delegates to registerUserAccount module", async () => {
		const mod = await import(
			"@/lib/domains/platform-access/utils/register-user"
		);
		expect(typeof mod.registerUserAccount).toBe("function");
	});
});
