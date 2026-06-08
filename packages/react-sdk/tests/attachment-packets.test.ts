import { describe, expect, it } from "bun:test";
import { KEM, randomBytes, toHex } from "@filosign/crypto-utils";
import { getAddress } from "viem";
import { setSessionSeed } from "../src/hooks/auth/session-seed";
import {
	decryptAttachmentPacketAccess,
	encryptAttachmentPacket,
	wrapAttachmentPacketDekForWarm,
} from "../src/lib/attachment-packets";

describe("attachment packet E2EE", () => {
	it("roundtrips warm wrap through decryptAttachmentPacketAccess", async () => {
		const recipientSeed = randomBytes(64);
		const recipientWallet = getAddress(`0x${"cd".repeat(20)}` as `0x${string}`);
		const { publicKey: recipientEncryptionPublicKey } = await KEM.keyGen({
			seed: recipientSeed,
		});

		const encryptedPacket = await encryptAttachmentPacket({
			packet: {
				packetId: "packet-1",
				label: "Exhibit A",
				releaseMode: "review",
				recipientEmails: ["recipient@example.com"],
				files: [
					{
						id: "f1",
						name: "exhibit.pdf",
						mimeType: "application/pdf",
						bytes: new TextEncoder().encode("exhibit bytes"),
					},
				],
			},
		});

		const warmWrap = await wrapAttachmentPacketDekForWarm({
			packetCid: encryptedPacket.packetCid,
			packetId: "packet-1",
			packetDek: encryptedPacket.packetDek,
			recipient: {
				email: "recipient@example.com",
				encryptionPublicKey: toHex(recipientEncryptionPublicKey),
			},
		});

		const originalFetch = globalThis.fetch;
		const mockFetch = async () =>
			new Response(new Uint8Array(encryptedPacket.ciphertext), {
				status: 200,
			});
		globalThis.fetch = mockFetch as unknown as typeof fetch;

		try {
			setSessionSeed(recipientWallet, recipientSeed);
			const files = await decryptAttachmentPacketAccess({
				packetCid: encryptedPacket.packetCid,
				recipientEmail: "recipient@example.com",
				downloadUrl: "https://example.test/packet",
				kemCiphertext: warmWrap.kemCiphertext,
				encryptedPacketDek: warmWrap.encryptedPacketDek,
				keySeed: recipientSeed,
			});

			expect(files).toHaveLength(1);
			expect(files[0]?.name).toBe("exhibit.pdf");
			expect(
				new TextDecoder().decode(files[0]?.bytes ?? new Uint8Array()),
			).toBe("exhibit bytes");
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	it("roundtrips sender warm wrap for export-time decrypt", async () => {
		const senderSeed = randomBytes(64);
		const senderWallet = getAddress(`0x${"ef".repeat(20)}` as `0x${string}`);
		const { publicKey: senderEncryptionPublicKey } = await KEM.keyGen({
			seed: senderSeed,
		});

		const encryptedPacket = await encryptAttachmentPacket({
			packet: {
				packetId: "packet-sender",
				releaseMode: "review",
				recipientEmails: ["signer@example.com"],
				files: [
					{
						id: "f1",
						name: "sender-copy.pdf",
						mimeType: "application/pdf",
						bytes: new TextEncoder().encode("sender retained copy"),
					},
				],
			},
		});

		const senderWrap = await wrapAttachmentPacketDekForWarm({
			packetCid: encryptedPacket.packetCid,
			packetId: "packet-sender",
			packetDek: encryptedPacket.packetDek,
			recipient: {
				email: "sender@example.com",
				encryptionPublicKey: toHex(senderEncryptionPublicKey),
			},
		});

		const originalFetch = globalThis.fetch;
		const mockFetch = async () =>
			new Response(new Uint8Array(encryptedPacket.ciphertext), {
				status: 200,
			});
		globalThis.fetch = mockFetch as unknown as typeof fetch;

		try {
			setSessionSeed(senderWallet, senderSeed);
			const files = await decryptAttachmentPacketAccess({
				packetCid: encryptedPacket.packetCid,
				recipientEmail: "sender@example.com",
				downloadUrl: "https://example.test/packet",
				kemCiphertext: senderWrap.kemCiphertext,
				encryptedPacketDek: senderWrap.encryptedPacketDek,
				keySeed: senderSeed,
			});
			expect(files[0]?.name).toBe("sender-copy.pdf");
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	it("roundtrips post-cold-claim warm rewrap through decryptAttachmentPacketAccess", async () => {
		const recipientSeed = randomBytes(64);
		const recipientWallet = getAddress(`0x${"ab".repeat(20)}` as `0x${string}`);
		const { publicKey: recipientEncryptionPublicKey } = await KEM.keyGen({
			seed: recipientSeed,
		});

		const encryptedPacket = await encryptAttachmentPacket({
			packet: {
				packetId: "packet-cold",
				releaseMode: "review",
				recipientEmails: ["cold@example.com"],
				files: [
					{
						id: "f1",
						name: "review-only.pdf",
						mimeType: "application/pdf",
						bytes: new TextEncoder().encode("review packet"),
					},
				],
			},
		});

		const warmWrap = await wrapAttachmentPacketDekForWarm({
			packetCid: encryptedPacket.packetCid,
			packetId: "packet-cold",
			packetDek: encryptedPacket.packetDek,
			recipient: {
				email: "cold@example.com",
				encryptionPublicKey: toHex(recipientEncryptionPublicKey),
			},
		});

		const originalFetch = globalThis.fetch;
		globalThis.fetch = (async () =>
			new Response(new Uint8Array(encryptedPacket.ciphertext), {
				status: 200,
			})) as unknown as typeof fetch;

		try {
			setSessionSeed(recipientWallet, recipientSeed);
			const files = await decryptAttachmentPacketAccess({
				packetCid: encryptedPacket.packetCid,
				recipientEmail: "cold@example.com",
				downloadUrl: "https://example.test/packet",
				kemCiphertext: warmWrap.kemCiphertext,
				encryptedPacketDek: warmWrap.encryptedPacketDek,
				keySeed: recipientSeed,
			});
			expect(files[0]?.name).toBe("review-only.pdf");
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	it("encryptAttachmentPacket exposes stable packetContentHash", async () => {
		const first = await encryptAttachmentPacket({
			packet: {
				packetId: "packet-hash",
				releaseMode: "review",
				recipientEmails: ["a@example.com"],
				files: [
					{
						id: "f1",
						name: "a.txt",
						mimeType: "text/plain",
						bytes: new TextEncoder().encode("same"),
					},
				],
			},
		});
		const second = await encryptAttachmentPacket({
			packet: {
				packetId: "packet-hash",
				releaseMode: "review",
				recipientEmails: ["a@example.com"],
				files: [
					{
						id: "f1",
						name: "a.txt",
						mimeType: "text/plain",
						bytes: new TextEncoder().encode("same"),
					},
				],
			},
		});
		expect(first.packetContentHash).toBe(second.packetContentHash);
		expect(first.packetContentHash).toMatch(/^0x[0-9a-f]{64}$/);
	});
});
