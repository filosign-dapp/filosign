import { describe, expect, mock, test } from "bun:test";
import { testEnvStub } from "@/tests/support/env-stub";

const envState = {
	...testEnvStub,
	PLATFORM_ADMIN_EMAILS: "admin@filosign.test",
};

mock.module("@/env", () => ({
	default: envState,
	env: envState,
}));

const { allowsPlatformAdminAccess, shouldAutoGrantTeamsProForAdminEmail } =
	await import("@/lib/platform/admin");

describe("platform admin", () => {
	test("allowsPlatformAdminAccess for configured emails", () => {
		expect(allowsPlatformAdminAccess("admin@filosign.test")).toBe(true);
		expect(allowsPlatformAdminAccess("Admin@Filosign.test")).toBe(true);
		expect(allowsPlatformAdminAccess("other@example.com")).toBe(false);
	});

	test("shouldAutoGrantTeamsProForAdminEmail follows admin email list (all deployments)", () => {
		expect(shouldAutoGrantTeamsProForAdminEmail("admin@filosign.test")).toBe(
			true,
		);
		expect(shouldAutoGrantTeamsProForAdminEmail("other@example.com")).toBe(
			false,
		);
	});
});
