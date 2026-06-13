import { describe, expect, test } from "bun:test";
import {
	accessGateFromSearch,
	readStoredAccessGate,
	storeAccessGateFromSearch,
} from "@/src/lib/web3/platform-access-session";

describe("platform-access-session", () => {
	test("accessGateFromSearch maps platformInvite param", () => {
		expect(
			accessGateFromSearch({
				platformInvite: "abc12345",
				setup: "",
				coldInvite: "",
				coldPieceCid: "",
				email: "",
				skipColdSign: "",
			}),
		).toEqual({ platformInviteToken: "abc12345" });
	});

	test("storeAccessGateFromSearch persists router search", () => {
		const store = new Map<string, string>();
		Object.defineProperty(globalThis, "sessionStorage", {
			value: {
				getItem: (key: string) => store.get(key) ?? null,
				setItem: (key: string, value: string) => {
					store.set(key, value);
				},
				removeItem: (key: string) => {
					store.delete(key);
				},
			},
			configurable: true,
		});

		storeAccessGateFromSearch({
			platformInvite: "router-token-abc",
			setup: "",
			coldInvite: "",
			coldPieceCid: "",
			email: "",
			skipColdSign: "",
		});
		expect(readStoredAccessGate()).toEqual({
			platformInviteToken: "router-token-abc",
		});
	});
});
