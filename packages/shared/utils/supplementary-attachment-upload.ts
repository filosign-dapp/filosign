import { SUPPLEMENTARY_ATTACHMENT_LIMITS } from "./file-data";

const MAX_FILE_NAME_LENGTH = 255;

function hasControlChars(value: string): boolean {
	for (const char of value) {
		const code = char.charCodeAt(0);
		if (code <= 0x1f || code === 0x7f) return true;
	}
	return false;
}

function stripControlChars(value: string): string {
	let out = "";
	for (const char of value) {
		const code = char.charCodeAt(0);
		if (code <= 0x1f || code === 0x7f) continue;
		out += char;
	}
	return out;
}

export function sanitizeSupplementaryAttachmentFileName(raw: string): string {
	const base = raw.replace(/^.*[/\\]/, "");
	const cleaned = stripControlChars(base).trim();
	const trimmed = cleaned.slice(0, MAX_FILE_NAME_LENGTH);
	return trimmed || "attachment";
}

export function isSafeSupplementaryAttachmentFileName(name: string): boolean {
	if (!name || name.length > MAX_FILE_NAME_LENGTH) return false;
	if (/[/\\]/.test(name) || hasControlChars(name)) return false;
	return sanitizeSupplementaryAttachmentFileName(name) === name;
}

export function inferSupplementaryAttachmentMimeType(
	browserMime?: string,
): string {
	const mime = browserMime?.trim();
	return mime || "application/octet-stream";
}

export function validateSupplementaryAttachmentFile(args: {
	name: string;
	sizeBytes: number;
	browserMime?: string;
}):
	| { ok: true; sanitizedName: string; mimeType: string }
	| { ok: false; code: string; message: string } {
	const rawName = args.name.trim();
	if (!rawName) {
		return {
			ok: false,
			code: "INVALID_NAME",
			message: "File name is required",
		};
	}
	if (args.sizeBytes <= 0) {
		return {
			ok: false,
			code: "EMPTY_FILE",
			message: `${rawName} is empty`,
		};
	}
	if (args.sizeBytes > SUPPLEMENTARY_ATTACHMENT_LIMITS.maxBytesPerFile) {
		const mb = Math.round(
			SUPPLEMENTARY_ATTACHMENT_LIMITS.maxBytesPerFile / (1024 * 1024),
		);
		return {
			ok: false,
			code: "FILE_TOO_LARGE",
			message: `${rawName} exceeds the ${mb}MB limit`,
		};
	}
	const sanitizedName = sanitizeSupplementaryAttachmentFileName(rawName);
	return {
		ok: true,
		sanitizedName,
		mimeType: inferSupplementaryAttachmentMimeType(args.browserMime),
	};
}
