export * from "./analytics-scrub";
export * from "./attachment-packets";
export * from "./auth-subject";
export * from "./completions-merkle";
export * from "./compliance-bundle";
export * from "./deployment";
export * from "./draft-crypto";
export * from "./draft-snapshot";
export * from "./draft-snapshot-digest";
export * from "./draft-storage-keys";
export * from "./file-audit";
export * from "./file-data";
export * from "./org-commitment";
export * from "./org-crypto";
export * from "./placement-manifest";
export * from "./register-routing";
export * from "./settlement-legal";
export * from "./settlement-rules";
export * from "./settlement-status-label";
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
