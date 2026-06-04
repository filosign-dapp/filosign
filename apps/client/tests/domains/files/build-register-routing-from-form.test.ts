import { describe, expect, it } from "bun:test";
import { buildRegisterRoutingFromForm } from "./build-register-routing-from-form";

const recipients = [
	{ role: "signer" as const, email: "alice@example.com", name: "Alice" },
	{ role: "viewer" as const, email: "bob@example.com", name: "Bob" },
];

describe("build-register-routing-from-form", () => {
	it("returns undefined when no advanced routing fields", () => {
		expect(buildRegisterRoutingFromForm({ recipients })).toBeUndefined();
	});

	it("passes through quorum routing", () => {
		const routing = buildRegisterRoutingFromForm({
			recipients,
			routing: { quorumN: 2, quorumSetEmails: ["alice@example.com"] },
		});
		expect(routing?.quorumN).toBe(2);
	});
});
