import { jsonStringify } from "@filosign/crypto-utils";
import type { Address } from "viem";
import { z } from "zod";
import { zEvmAddress } from "../helpers/zod";
import { zPlacementManifest } from "./placement";

export const SUPPLEMENTARY_ATTACHMENT_LIMITS = {
	maxPacketsPerEnvelope: 3,
	maxFilesPerPacket: 3,
	maxBytesPerFile: 5 * 1024 * 1024,
} as const;

export const zFileDataDocument = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	mimeType: z.string().min(1),
	sha256Plaintext: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
	bytesB64: z.string().min(1),
});

/** Signable package (plaintext before encrypt). */
export const zFileData = z.object({
	version: z.literal(1),
	documents: z.array(zFileDataDocument).min(1),
	sender: zEvmAddress(),
	timestamp: z.number(),
	metadata: z.object({
		name: z.string(),
	}),
	placementManifest: zPlacementManifest,
});

export type FileData = z.infer<typeof zFileData>;
export type FileDataDocument = z.infer<typeof zFileDataDocument>;

function base64ToUint8(b64: string): Uint8Array {
	const binary = atob(b64);
	const out = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		const code = binary.charCodeAt(i);
		if (code === undefined) throw new Error("Invalid base64");
		out[i] = code;
	}
	return out;
}

function uint8ToBase64(bytes: Uint8Array): string {
	let binary = "";
	for (const v of bytes) {
		binary += String.fromCharCode(v);
	}
	return btoa(binary);
}

export async function sha256PlaintextHex(
	bytes: Uint8Array,
): Promise<`0x${string}`> {
	const buf = bytes.buffer.slice(
		bytes.byteOffset,
		bytes.byteOffset + bytes.byteLength,
	) as ArrayBuffer;
	const digest = await crypto.subtle.digest("SHA-256", buf);
	const hex = [...new Uint8Array(digest)]
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	return `0x${hex}` as `0x${string}`;
}

export async function encodeFileData(data: {
	documents: {
		id: string;
		name: string;
		mimeType: string;
		bytes: Uint8Array;
	}[];
	sender: Address;
	timestamp: number;
	metadata: FileData["metadata"];
	placementManifest: FileData["placementManifest"];
}): Promise<Uint8Array> {
	const encoder = new TextEncoder();
	const documents = await Promise.all(
		data.documents.map(async (d) => ({
			id: d.id,
			name: d.name,
			mimeType: d.mimeType,
			sha256Plaintext: await sha256PlaintextHex(d.bytes),
			bytesB64: uint8ToBase64(d.bytes),
		})),
	);
	const fileData: FileData = {
		version: 1,
		documents,
		sender: data.sender,
		timestamp: data.timestamp,
		metadata: data.metadata,
		placementManifest: data.placementManifest,
	};
	return encoder.encode(jsonStringify(fileData));
}

export type DecodedFileData = {
	version: 1;
	documents: Array<FileDataDocument & { bytes: Uint8Array }>;
	sender: Address;
	timestamp: number;
	metadata: FileData["metadata"];
	placementManifest: FileData["placementManifest"];
};

export async function decodeFileData(
	data: Uint8Array,
): Promise<DecodedFileData> {
	const decoder = new TextDecoder();
	const raw = JSON.parse(decoder.decode(data)) as unknown;
	const parsed = zFileData.safeParse(raw);
	if (!parsed.success) {
		throw new Error("Invalid file data: expected version 1 signable package");
	}
	return {
		version: 1,
		documents: parsed.data.documents.map((d) => ({
			...d,
			bytes: base64ToUint8(d.bytesB64),
		})),
		sender: parsed.data.sender,
		timestamp: parsed.data.timestamp,
		metadata: parsed.data.metadata,
		placementManifest: parsed.data.placementManifest,
	};
}
