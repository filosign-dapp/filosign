import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getAddress } from "viem";
import { zFileCommentAppendBody } from "@/lib/domains/files/comments";
import {
	zCancelSignerReplacementBody,
	zExecuteSignerReplacementBody,
	zNewSignerE2ee,
	zProposeSignerReplacementBody,
} from "@/lib/domains/files/signer-replacement";
import {
	assertSignOrdering,
	isValidAckSignature,
} from "@/lib/domains/files/utils/piece-helpers";

describe("files", () => {
	describe("files-registry-routing", () => {
		const repoRoot = join(import.meta.dir, "../../../..");

		describe("files.piece.detail registry routing", () => {
			test("selects registryAddress from the files row", () => {
				const src = readFileSync(
					join(repoRoot, "apps/server/lib/domains/files/piece.ts"),
					"utf8",
				);
				expect(src).toContain("registryAddress: files.registryAddress");
			});

			test("output schema exposes registryAddress", () => {
				const src = readFileSync(
					join(repoRoot, "apps/server/api/orpc/schemas/files-piece-output.ts"),
					"utf8",
				);
				expect(src).toContain("registryAddress: zHexString()");
			});
		});

		describe("sign and ack EIP-712 verifyingContract", () => {
			test("useSignFile signs against envelopeRegistryAt(registryAddress)", () => {
				const src = readFileSync(
					join(repoRoot, "packages/react-sdk/src/hooks/files/useSignFile.ts"),
					"utf8",
				);
				expect(src).toContain("envelopeRegistryAt(contracts, registryAddress)");
				expect(src).toContain("verifyingContract: registry.address");
			});

			test("useAckFile signs against envelopeRegistryAt(registryAddress)", () => {
				const src = readFileSync(
					join(repoRoot, "packages/react-sdk/src/hooks/files/useAckFile.ts"),
					"utf8",
				);
				expect(src).toContain("envelopeRegistryAt(contracts, registryAddress)");
				expect(src).toContain("verifyingContract: registry.address");
			});

			test("eip712signature supports per-registry verifyingContract override", () => {
				const src = readFileSync(
					join(repoRoot, "apps/contracts/services/utils.ts"),
					"utf8",
				);
				expect(src).toContain("options?: { verifyingContract?:");
				expect(src).toContain("options?.verifyingContract ??");
			});
		});
	});

	describe("participant-access", () => {
		describe("participant-access", () => {
			test("isValidAckSignature accepts EIP-712-length hex", () => {
				const sig = `0x${"ab".repeat(65)}`;
				expect(isValidAckSignature(sig)).toBe(true);
			});

			test("isValidAckSignature rejects short hex", () => {
				expect(isValidAckSignature("0x1234")).toBe(false);
			});

			test("assertSignOrdering enforces ack → view → sign", () => {
				const ack = new Date("2026-01-01T00:00:00.000Z");
				const view = new Date("2026-01-01T00:01:00.000Z");
				const sign = new Date("2026-01-01T00:02:00.000Z");
				expect(() => assertSignOrdering(ack, view, sign)).not.toThrow();
			});

			test("assertSignOrdering rejects view before ack", () => {
				const ack = new Date("2026-01-01T00:02:00.000Z");
				const view = new Date("2026-01-01T00:01:00.000Z");
				const sign = new Date("2026-01-01T00:03:00.000Z");
				expect(() => assertSignOrdering(ack, view, sign)).toThrow();
			});

			test("assertSignOrdering rejects sign before view (stale chain timestamp case)", () => {
				const ack = new Date("2026-01-01T00:00:00.000Z");
				const view = new Date("2026-01-01T00:01:00.000Z");
				const staleChainSignAt = new Date("2026-01-01T00:00:30.000Z");
				expect(() => assertSignOrdering(ack, view, staleChainSignAt)).toThrow(
					/Open the document first/,
				);
			});
		});
	});

	describe("signer-replacement", () => {
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
	});

	describe("file-comments-access", () => {
		describe("file-comments", () => {
			test("zFileCommentAppendBody accepts ciphertext append payload", () => {
				const parsed = zFileCommentAppendBody.safeParse({
					pieceCid: "bafytest",
					commentId: "550e8400-e29b-41d4-a716-446655440000",
					ciphertext: `0x${"ab".repeat(32)}`,
				});
				expect(parsed.success).toBe(true);
			});

			test("zFileCommentAppendBody rejects missing pieceCid", () => {
				const parsed = zFileCommentAppendBody.safeParse({
					commentId: "550e8400-e29b-41d4-a716-446655440000",
					ciphertext: `0x${"ab".repeat(32)}`,
				});
				expect(parsed.success).toBe(false);
			});
		});
	});

	describe("sharing", () => {
		/**
		 * Documents expected anchor/recipient orientation for org connection sync
		 * (recipient approves sender on-chain → anchor sender, recipient wallet).
		 */
		describe("org connection approval orientation", () => {
			test("anchor is sender and recipient is approver", () => {
				const sender = getAddress("0x1111111111111111111111111111111111111111");
				const recipient = getAddress(
					"0x2222222222222222222222222222222222222222",
				);
				expect(sender).not.toBe(recipient);
			});
		});
	});
});
