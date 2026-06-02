import {
	attachmentPacketDekWrapInfo,
	encryption,
	jsonStringify,
	KEM,
	randomBytes,
	toBytes,
	toHex,
	wrapPassphraseDek,
} from "@filosign/crypto-utils";
import {
	type AttachmentPacketSendInput,
	base64ToUint8,
	normalizePlacementRecipientEmail,
	sha256PlaintextHex,
	zAttachmentPacketPlaintext,
} from "@filosign/shared";
import type { Hex } from "viem";
import { calculatePieceCid } from "../utils/piece";

const ATTACHMENT_PACKET_ENCRYPTION_INFO = "filosign:attachment-packet:v1";

export type AttachmentPacketDraft = {
	packetId: string;
	label?: string;
	releaseMode: "review" | "conditional";
	releaseType?: AttachmentPacketSendInput["releaseType"];
	releaseParams?: AttachmentPacketSendInput["releaseParams"];
	recipientEmails: string[];
	files: { id: string; name: string; mimeType: string; bytes: Uint8Array }[];
};

function uint8ToBase64(bytes: Uint8Array): string {
	let binary = "";
	for (const v of bytes) {
		binary += String.fromCharCode(v);
	}
	return btoa(binary);
}

export async function encryptAttachmentPacket(args: {
	packet: AttachmentPacketDraft;
}): Promise<{
	packetCid: string;
	packetContentHash: Hex;
	ciphertext: Uint8Array;
	packetDek: Uint8Array;
}> {
	const files = await Promise.all(
		args.packet.files.map(async (f) => ({
			id: f.id,
			name: f.name,
			mimeType: f.mimeType,
			sha256Plaintext: await sha256PlaintextHex(f.bytes),
			bytesB64: uint8ToBase64(f.bytes),
		})),
	);
	const plaintextObj = zAttachmentPacketPlaintext.parse({
		version: 1,
		packetId: args.packet.packetId,
		label: args.packet.label,
		files,
	});
	const plaintext = new TextEncoder().encode(jsonStringify(plaintextObj));
	const packetDek = randomBytes(32);
	const encrypted = await encryption.encrypt({
		message: plaintext,
		secretKey: packetDek,
		info: ATTACHMENT_PACKET_ENCRYPTION_INFO,
	});
	const packetCid = calculatePieceCid(encrypted).toString();
	const packetContentHash = await sha256PlaintextHex(plaintext);
	return { packetCid, packetContentHash, ciphertext: encrypted, packetDek };
}

export async function wrapAttachmentPacketDekForWarm(args: {
	packetCid: string;
	packetId: string;
	packetDek: Uint8Array;
	recipient: { email: string; encryptionPublicKey: Hex };
}): Promise<{ kemCiphertext: Hex; encryptedPacketDek: Hex }> {
	const email = normalizePlacementRecipientEmail(args.recipient.email);
	const { ciphertext, sharedSecret } = await KEM.encapsulate({
		publicKeyOther: toBytes(args.recipient.encryptionPublicKey),
	});
	const encryptedPacketDek = await encryption.encrypt({
		message: args.packetDek,
		secretKey: sharedSecret,
		info: `${args.packetCid}:${email}`,
	});
	return {
		kemCiphertext: toHex(ciphertext),
		encryptedPacketDek: toHex(encryptedPacketDek),
	};
}

export type DecryptedAttachmentPacketFile = {
	id: string;
	name: string;
	mimeType: string;
	bytes: Uint8Array;
};

export async function decryptAttachmentPacketAccess(args: {
	packetCid: string;
	recipientEmail: string;
	downloadUrl: string;
	kemCiphertext: Hex;
	encryptedPacketDek: Hex;
	keySeed: Uint8Array;
}): Promise<DecryptedAttachmentPacketFile[]> {
	const email = normalizePlacementRecipientEmail(args.recipientEmail);

	const { privateKey: userKemPrivate } = await KEM.keyGen({
		seed: args.keySeed,
	});
	const { sharedSecret } = await KEM.decapsulate({
		ciphertext: toBytes(args.kemCiphertext),
		privateKeySelf: userKemPrivate,
	});
	const packetDek = await encryption.decrypt({
		ciphertext: toBytes(args.encryptedPacketDek),
		secretKey: sharedSecret,
		info: `${args.packetCid}:${email}`,
	});

	const downloadResponse = await fetch(args.downloadUrl, { method: "GET" });
	if (!downloadResponse.ok) {
		throw new Error(
			`Failed to fetch attachment packet (${downloadResponse.status})`,
		);
	}
	const ciphertext = new Uint8Array(await downloadResponse.arrayBuffer());
	const plaintext = await encryption.decrypt({
		ciphertext,
		secretKey: packetDek,
		info: ATTACHMENT_PACKET_ENCRYPTION_INFO,
	});

	const parsed = zAttachmentPacketPlaintext.parse(
		JSON.parse(new TextDecoder().decode(plaintext)),
	);

	return parsed.files.map((f) => ({
		id: f.id,
		name: f.name,
		mimeType: f.mimeType,
		bytes: base64ToUint8(f.bytesB64),
	}));
}

export async function wrapAttachmentPacketDekForCold(args: {
	packetId: string;
	packetDek: Uint8Array;
	phrase: string;
}): Promise<Hex> {
	return toHex(
		await wrapPassphraseDek({
			encryptionKey: args.packetDek,
			phrase: args.phrase,
			info: attachmentPacketDekWrapInfo(args.packetId),
		}),
	);
}
