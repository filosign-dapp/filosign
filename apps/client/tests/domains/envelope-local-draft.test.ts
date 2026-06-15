import { describe, expect, test } from "bun:test";
import {
	pruneSignatureFields,
	recipientFingerprint,
} from "@/src/lib/domains/drafts/envelope-local-draft";
import type { SignatureField } from "@/src/lib/domains/files/envelope-form-types";

describe("recipientFingerprint", () => {
	test("ignores wallet address so warm lookups do not look like roster changes", () => {
		const cold = [
			{
				clientRowId: "r1",
				name: "Alice",
				email: "alice@corp.com",
				role: "signer" as const,
			},
		];
		const warm = [
			{
				...cold[0],
				walletAddress: "0xAbCdEf0123456789AbCdEf0123456789AbCdEf01" as const,
			},
		];

		expect(recipientFingerprint(cold)).toBe(recipientFingerprint(warm));
	});
});

describe("pruneSignatureFields", () => {
	const field: SignatureField = {
		id: "field-1",
		type: "signature",
		x: 10,
		y: 20,
		width: 120,
		height: 40,
		page: 1,
		documentId: "doc-1",
		assignedSignerWallet: "",
		assignedSignerName: "Alice",
		assignedSignerEmail: "alice@corp.com",
		required: true,
	};

	test("keeps fields for signer emails after wallet resolution", () => {
		const recipients = [
			{
				clientRowId: "r1",
				name: "Alice",
				email: "alice@corp.com",
				role: "signer" as const,
				walletAddress: "0xAbCdEf0123456789AbCdEf0123456789AbCdEf01" as const,
			},
		];

		expect(pruneSignatureFields([field], recipients)).toHaveLength(1);
	});
});
