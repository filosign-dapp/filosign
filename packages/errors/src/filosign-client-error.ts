import type { AppErrorCode } from "./catalog/index";

export class FilosignClientError extends Error {
	readonly code: AppErrorCode;

	constructor(code: AppErrorCode, options?: { cause?: unknown }) {
		const message = code;
		super(message, options?.cause ? { cause: options.cause } : undefined);
		this.name = "FilosignClientError";
		this.code = code;
	}
}

export function isFilosignClientError(
	error: unknown,
): error is FilosignClientError {
	return error instanceof FilosignClientError;
}
