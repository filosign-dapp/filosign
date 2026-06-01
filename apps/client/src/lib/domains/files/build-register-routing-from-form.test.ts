import { describe, expect, it } from "bun:test";
import {
	buildRegisterRoutingFromForm,
	deriveOptionalSignerEmailsFromRecipients,
} from "./build-register-routing-from-form";

const recipients = [
	{ role: "signer" as const, email: "alice@example.com", name: "Alice" },
	{
		role: "signer" as const,
		email: "bob@example.com",
		name: "Bob",
		signerRequired: false,
	},
];

describe("build-register-routing-from-form", () => {
	it("derives optional signers from recipient cards", () => {
		expect(deriveOptionalSignerEmailsFromRecipients(recipients)).toEqual([
			"bob@example.com",
		]);
	});

	it("includes optionalSignerEmails in routing at send", () => {
		const routing = buildRegisterRoutingFromForm({ recipients });
		expect(routing?.optionalSignerEmails).toEqual(["bob@example.com"]);
	});
});
