import { jsonStringify } from "@filosign/crypto-utils";
import type { Address } from "viem";
import { z } from "zod";
import { zEvmAddress } from "../helpers/zod";
import {
	type PlacementManifest,
	zPlacementManifest,
	zPlacementManifestV3,
} from "./placement";

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

/** Multi-document signable package (plaintext before encrypt). */
export const zFileDataV2 = z.object({
	version: z.literal(2),
	documents: z.array(zFileDataDocument).min(1),
	sender: zEvmAddress(),
	timestamp: z.number(),
	metadata: z.object({
		name: z.string(),
	}),
	placementManifest: zPlacementManifestV3,
});

/** Legacy single-PDF package (read-only for old rows). */
export const zFileDataV1 = z.object({
	bytesB64: z.string(),
	sender: zEvmAddress(),
	timestamp: z.number(),
	metadata: z.object({
		name: z.string(),
	}),
	placementManifest: zPlacementManifest,
});

export const zFileData = () => z.union([zFileDataV2, zFileDataV1]);

export type FileDataV2 = z.infer<typeof zFileDataV2>;
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

export async function encodeFileDataV2(data: {
	documents: {
		id: string;
		name: string;
		mimeType: string;
		bytes: Uint8Array;
	}[];
	sender: Address;
	timestamp: number;
	metadata: FileDataV2["metadata"];
	placementManifest: FileDataV2["placementManifest"];
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
	const fileData: FileDataV2 = {
		version: 2,
		documents,
		sender: data.sender,
		timestamp: data.timestamp,
		metadata: data.metadata,
		placementManifest: data.placementManifest,
	};
	return encoder.encode(jsonStringify(fileData));
}

/** @deprecated Use encodeFileDataV2 for new sends. */
export function encodeFileData(data: {
	bytes: Uint8Array;
	sender: Address;
	timestamp: number;
	metadata: { name: string };
	placementManifest: PlacementManifest;
}): Uint8Array {
	const encoder = new TextEncoder();
	const fileData = {
		bytesB64: uint8ToBase64(data.bytes),
		sender: data.sender,
		timestamp: data.timestamp,
		metadata: data.metadata,
		placementManifest: data.placementManifest,
	};
	return encoder.encode(jsonStringify(fileData));
}

export type DecodedFileData =
	| {
			version: 2;
			documents: Array<FileDataDocument & { bytes: Uint8Array }>;
			sender: Address;
			timestamp: number;
			metadata: FileDataV2["metadata"];
			placementManifest: FileDataV2["placementManifest"];
	  }
	| {
			version: 1;
			bytes: Uint8Array;
			sender: Address;
			timestamp: number;
			metadata: { name: string };
			placementManifest: PlacementManifest;
	  };

export async function decodeFileData(
	data: Uint8Array,
): Promise<DecodedFileData> {
	const decoder = new TextDecoder();
	const raw = JSON.parse(decoder.decode(data)) as unknown;
	const v2 = zFileDataV2.safeParse(raw);
	if (v2.success) {
		return {
			version: 2,
			documents: v2.data.documents.map((d) => ({
				...d,
				bytes: base64ToUint8(d.bytesB64),
			})),
			sender: v2.data.sender,
			timestamp: v2.data.timestamp,
			metadata: v2.data.metadata,
			placementManifest: v2.data.placementManifest,
		};
	}
	const v1 = zFileDataV1.parse(raw);
	return {
		version: 1,
		bytes: base64ToUint8(v1.bytesB64),
		sender: v1.sender,
		timestamp: v1.timestamp,
		metadata: v1.metadata,
		placementManifest: v1.placementManifest,
	};
}
