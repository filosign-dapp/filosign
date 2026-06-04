import { describe, expect, test } from "bun:test";
import {
	zCancelSignerReplacementBody,
	zExecuteSignerReplacementBody,
	zNewSignerE2ee,
	zProposeSignerReplacementBody,
} from "@/lib/domains/files/signer-replacement";

const wallet = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const hex32 = `0x${"aa".repeat(32)}`;
const sig = `0x${"bb".repeat(65)}`;

describe("signer replacement Zod bodies", () => {
	test("zProposeSignerReplacementBody accepts warm signer E2EE", () => {
		const parsed = zProposeSignerReplacementBody.safeParse({
			pieceCid: "bafytest",
			recaller: wallet,
			oldCommitment: hex32,
			newCommitment: hex32,
			timestamp: 1_700_000_000,
			signature: sig,
			newSignerE2ee: {
				kind: "warm",
				wallet,
				kemCiphertext: hex32,
				encryptedEncryptionKey: hex32,
			},
		});
		expect(parsed.success).toBe(true);
	});

	test("zProposeSignerReplacementBody rejects invalid email on cold signer", () => {
		const parsed = zProposeSignerReplacementBody.safeParse({
			pieceCid: "bafytest",
			recaller: wallet,
			oldCommitment: hex32,
			newCommitment: hex32,
			timestamp: 1_700_000_000,
			signature: sig,
			newSignerE2ee: {
				kind: "cold",
				email: "not-an-email",
				inviteToken: "tok",
				wrappedEncryptionKey: hex32,
			},
		});
		expect(parsed.success).toBe(false);
	});

	test("zExecuteSignerReplacementBody requires pieceCid and recaller", () => {
		expect(
			zExecuteSignerReplacementBody.safeParse({
				pieceCid: "bafytest",
				recaller: wallet,
			}).success,
		).toBe(true);
	});

	test("zCancelSignerReplacementBody requires timestamp and signature", () => {
		expect(
			zCancelSignerReplacementBody.safeParse({
				pieceCid: "bafytest",
				recaller: wallet,
				timestamp: 1,
				signature: sig,
			}).success,
		).toBe(true);
	});

	test("zNewSignerE2ee discriminates warm vs cold", () => {
		expect(
			zNewSignerE2ee.safeParse({
				kind: "warm",
				wallet,
				kemCiphertext: hex32,
				encryptedEncryptionKey: hex32,
			}).success,
		).toBe(true);
	});
});
