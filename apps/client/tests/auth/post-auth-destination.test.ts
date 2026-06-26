import { describe, expect, test } from "bun:test";
import { DEFAULT_ACCOUNT_FIRST_NAME } from "@/src/lib/auth/account-defaults";
import {
	navigatePostAuthDestination,
	onboardingSearchFromColdEntry,
	onboardingSearchFromSignDocument,
	postAuthDestinationKey,
	resolvePostAuthDestination,
} from "@/src/lib/auth/post-auth-destination";

const defaultProfile = { firstName: DEFAULT_ACCOUNT_FIRST_NAME };
const namedProfile = { firstName: "Jane", lastName: "Doe" };

const coldSearch = {
	coldPieceCid: "bafyPiece",
	coldInvite: "invite-token",
	email: "signer@example.com",
	platformInvite: "",
	setup: "",
	orgInvite: "",
	skipColdSign: "",
};

const signSearch = { pieceCid: "bafyPiece", invite: "invite-token" };

describe("resolvePostAuthDestination", () => {
	test("returns pending while profile loads", () => {
		expect(
			resolvePostAuthDestination({
				coldSearch,
				signSearch,
				profile: defaultProfile,
				profilePending: true,
			}),
		).toEqual({ type: "pending" });
	});

	test("cold invite with default name routes to onboarding with cold params", () => {
		const result = resolvePostAuthDestination({
			coldSearch,
			signSearch,
			profile: defaultProfile,
			profilePending: false,
		});
		expect(result).toEqual({
			type: "onboarding",
			search: onboardingSearchFromColdEntry(coldSearch),
		});
	});

	test("cold invite with real name routes to sign", () => {
		expect(
			resolvePostAuthDestination({
				coldSearch,
				signSearch,
				profile: namedProfile,
				profilePending: false,
			}),
		).toEqual({ type: "sign", search: signSearch });
	});

	test("no cold invite with default name routes to onboarding", () => {
		const emptyCold = {
			coldPieceCid: "",
			coldInvite: "",
			email: "",
			platformInvite: "",
			setup: "",
			orgInvite: "",
			skipColdSign: "",
		};
		expect(
			resolvePostAuthDestination({
				coldSearch: emptyCold,
				signSearch: null,
				profile: defaultProfile,
				profilePending: false,
			}),
		).toEqual({
			type: "onboarding",
			search: onboardingSearchFromColdEntry(emptyCold),
		});
	});

	test("no cold invite with real name routes to dashboard", () => {
		const emptyCold = {
			coldPieceCid: "",
			coldInvite: "",
			email: "",
			platformInvite: "",
			setup: "",
			orgInvite: "",
			skipColdSign: "",
			upgrade: "teams",
			interval: "monthly",
		};
		expect(
			resolvePostAuthDestination({
				coldSearch: emptyCold,
				signSearch: null,
				profile: namedProfile,
				profilePending: false,
			}),
		).toEqual({
			type: "dashboard",
			search: { upgrade: "teams", interval: "monthly" },
		});
	});
});

describe("navigatePostAuthDestination", () => {
	test("routes onboarding, sign, and dashboard destinations", async () => {
		const calls: Array<{ to: string; search?: unknown; replace?: boolean }> =
			[];
		const navigate = (options: {
			to: string;
			search?: unknown;
			replace?: boolean;
		}) => {
			calls.push(options);
		};

		await navigatePostAuthDestination(
			navigate,
			{
				type: "onboarding",
				search: onboardingSearchFromColdEntry(coldSearch),
			},
			{ replace: true },
		);
		await navigatePostAuthDestination(navigate, {
			type: "sign",
			search: signSearch,
		});
		await navigatePostAuthDestination(navigate, {
			type: "dashboard",
			search: { upgrade: "teams" },
		});

		expect(calls).toEqual([
			{
				to: "/onboarding",
				search: onboardingSearchFromColdEntry(coldSearch),
				replace: true,
			},
			{ to: "/dashboard/document/sign", search: signSearch, replace: false },
			{
				to: "/dashboard",
				search: { upgrade: "teams" },
				replace: false,
			},
		]);
	});
});

describe("onboardingSearchFromSignDocument", () => {
	test("maps sign URL params to cold entry search", () => {
		expect(
			onboardingSearchFromSignDocument({
				pieceCid: "abc",
				invite: "tok",
			}),
		).toEqual({
			coldPieceCid: "abc",
			coldInvite: "tok",
			email: "",
			platformInvite: "",
			setup: "",
			orgInvite: "",
			skipColdSign: "",
		});
	});
});

describe("postAuthDestinationKey", () => {
	test("builds stable keys per destination type", () => {
		expect(
			postAuthDestinationKey({
				type: "sign",
				search: signSearch,
			}),
		).toBe("sign:bafyPiece:invite-token");

		expect(
			postAuthDestinationKey({
				type: "dashboard",
				search: { upgrade: "teams", interval: "monthly" },
			}),
		).toBe("dashboard:teams:monthly");
	});
});
