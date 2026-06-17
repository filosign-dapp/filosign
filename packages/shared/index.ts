export * from "./activation";
export * from "./feedback";
export * from "./platform-invite";
export * from "./utils/attachment";
export * from "./utils/attachment-packet-validation";
export * from "./utils/compliance";
export * from "./utils/compliance-workflows";
export * from "./utils/crypto";
export * from "./utils/deployment";
export * from "./utils/document-merkle";
export * from "./utils/draft";
export * from "./utils/envelope-metadata";
export * from "./utils/evm-wire";
export * from "./utils/field-completion";
export * from "./utils/file-data";
export * from "./utils/keygen";
export * from "./utils/placement";
export * from "./utils/platform-invite";
export * from "./utils/pricing-media";
export * from "./utils/render-typed-signature-svg";
export * from "./utils/routing";
export * from "./utils/safe-transaction-service";
export * from "./utils/settlement-legal";
export * from "./utils/settlement-rules";
export * from "./utils/sign-field-session";
export * from "./utils/signable-document-upload";
export * from "./utils/signature-artifact";
export * from "./utils/signature-font-catalog";
export * from "./utils/signature-raster-fit";
export * from "./utils/supplementary-attachment-upload";
export * from "./utils/supplementary-packet-unlock";
export * from "./utils/template";
export * from "./utils/template-editor";

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
