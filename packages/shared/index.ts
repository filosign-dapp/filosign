import { jsonStringify } from "@filosign/crypto-utils/node";
import type { Address } from "viem";
import type z from "zod";
import { zFileData } from "./file-data";
import type { PlacementManifest } from "./placement-manifest";

export * from "./completions-merkle";
export * from "./compliance-bundle";
export { zFileData } from "./file-data";
export * from "./placement-manifest";
export * from "./privy-subject-commitment";
export * from "./signer-email-commitment";

export function base64ToUint8(base64: string): Uint8Array {
	const binary = atob(base64);
	const len = binary.length;
	const bytes = new Uint8Array(len);
	for (let i = 0; i < len; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}
export function uint8ToBase64(uint8: Uint8Array): string {
	let binary = "";
	const len = uint8.byteLength;
	for (let i = 0; i < len; i++) {
		const v = uint8[i];
		if (v === undefined) continue;
		binary += String.fromCharCode(v);
	}
	return btoa(binary);
}

type FileData = z.infer<ReturnType<typeof zFileData>>;

export function encodeFileData(data: {
	bytes: Uint8Array;
	sender: Address;
	timestamp: number;
	metadata: FileData["metadata"];
	placementManifest: PlacementManifest;
}) {
	const encoder = new TextEncoder();
	const fileData: FileData = {
		bytesB64: uint8ToBase64(data.bytes),
		sender: data.sender,
		timestamp: data.timestamp,
		metadata: data.metadata,
		placementManifest: data.placementManifest,
	};
	return encoder.encode(jsonStringify(fileData));
}

export async function decodeFileData(data: Uint8Array) {
	const decoder = new TextDecoder();
	const parsed = await zFileData().parseAsync(JSON.parse(decoder.decode(data)));
	return {
		bytes: base64ToUint8(parsed.bytesB64),
		sender: parsed.sender,
		timestamp: parsed.timestamp,
		metadata: parsed.metadata,
		placementManifest: parsed.placementManifest,
	};
}
