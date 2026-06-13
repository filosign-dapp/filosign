import { describe, expect, test } from "bun:test";
import { mapColdInviteTokensByEmail } from "../utils/attachment";

describe("mapColdInviteTokensByEmail", () => {
	test("maps each normalized email to its invite token", () => {
		const map = mapColdInviteTokensByEmail([
			{ email: "Alice@Example.com", inviteToken: "token-aaaaaaaaaaaaaaaa" },
			{ email: "bob@example.com", inviteToken: "token-bbbbbbbbbbbbbbbb" },
		]);

		expect(map.get("alice@example.com")).toBe("token-aaaaaaaaaaaaaaaa");
		expect(map.get("bob@example.com")).toBe("token-bbbbbbbbbbbbbbbb");
		expect(map.size).toBe(2);
	});

	test("ignores entries with blank email or token", () => {
		const map = mapColdInviteTokensByEmail([
			{ email: "   ", inviteToken: "token-aaaaaaaaaaaaaaaa" },
			{ email: "a@example.com", inviteToken: "   " },
		]);

		expect(map.size).toBe(0);
	});
});
