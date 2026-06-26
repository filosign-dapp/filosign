import { describe, expect, test } from "bun:test";
import {
	accessGateFromSearch,
	readStoredAccessGate,
	storeAccessGateFromSearch,
} from "@/src/lib/web3/platform-access-session";
import { withSessionStorageStub } from "../support/session-storage-stub";

describe("platform-access-session", () => {
	test("accessGateFromSearch maps platformInvite param", () => {
		expect(
			accessGateFromSearch({
				platformInvite: "abc12345",
				setup: "",
				orgInvite: "",
				coldInvite: "",
				coldPieceCid: "",
				email: "",
				skipColdSign: "",
			}),
		).toEqual({ platformInviteToken: "abc12345" });
	});

	test("accessGateFromSearch maps orgInvite param", () => {
		expect(
			accessGateFromSearch({
				platformInvite: "",
				setup: "",
				orgInvite: "workspace-token-abc",
				coldInvite: "",
				coldPieceCid: "",
				email: "",
				skipColdSign: "",
			}),
		).toEqual({ orgInviteToken: "workspace-token-abc" });
	});

	test("storeAccessGateFromSearch persists router search", () => {
		withSessionStorageStub(() => {
			storeAccessGateFromSearch({
				platformInvite: "router-token-abc",
				setup: "",
				orgInvite: "",
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
});
