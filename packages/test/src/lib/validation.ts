// Constants
export const RELOAD_DELAY_MS = 1000;
export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const ALLOWED_FILE_TYPES = ["application/pdf"] as const;

// Display truncation constants
export const MAX_FILE_NAME_DISPLAY = 50;
export const TRUNCATED_FILE_NAME_LENGTH = 47; // MAX_FILE_NAME_DISPLAY - 3 for "..."
export const MAX_CID_DISPLAY_LENGTH = 60;
export const TRUNCATED_CID_LENGTH = 57; // MAX_CID_DISPLAY_LENGTH - 3 for "..."
export const MAX_CONTENT_DISPLAY_LENGTH = 2000;
export const TRUNCATED_CONTENT_LENGTH = 1997; // MAX_CONTENT_DISPLAY_LENGTH - 3 for "..."
export const DEFAULT_SIGNATURE_POSITION: [number, number, number, number] = [
	10, 20, 30, 40,
];

// File validation
export interface FileValidationError {
	type: "size" | "type" | "empty";
	message: string;
}

export function validateFile(file: File): FileValidationError | null {
	if (file.size === 0) {
		return { type: "empty", message: "File is empty" };
	}

	if (file.size > MAX_FILE_SIZE_BYTES) {
		return {
			type: "size",
			message: `File size exceeds ${MAX_FILE_SIZE_MB}MB limit`,
		};
	}

	if (
		!ALLOWED_FILE_TYPES.includes(
			file.type as (typeof ALLOWED_FILE_TYPES)[number],
		)
	) {
		return {
			type: "type",
			message: `Only ${ALLOWED_FILE_TYPES.join(", ")} files are allowed`,
		};
	}

	return null;
}

// Safe type guards
export function isValidEthereumAddress(val: unknown): val is `0x${string}` {
	if (typeof val !== "string") return false;
	return /^0x[a-fA-F0-9]{40}$/.test(val);
}

export function isValidFileStatus(val: unknown): val is "s3" {
	return val === "s3";
}

export function isNonEmptyString(val: unknown): val is string {
	return typeof val === "string" && val.length > 0;
}

// Safe parsers with error handling
export function parseEthereumAddress(val: unknown): `0x${string}` | null {
	if (isValidEthereumAddress(val)) return val;
	return null;
}

export function parseFileStatus(val: unknown): "s3" | null {
	if (isValidFileStatus(val)) return val;
	return null;
}

export function parseString(val: unknown): string | null {
	if (isNonEmptyString(val)) return val;
	return null;
}
