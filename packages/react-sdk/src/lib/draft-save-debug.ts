const PREFIX = "[draft-save]";

export function debugDraftSave(
	step: string,
	data?: Record<string, unknown>,
): void {
	if (typeof import.meta !== "undefined" && !import.meta.env?.DEV) {
		return;
	}
	if (data !== undefined) {
		console.info(PREFIX, step, data);
	} else {
		console.info(PREFIX, step);
	}
}

export function debugDraftSaveError(
	step: string,
	error: unknown,
	data?: Record<string, unknown>,
): void {
	if (typeof import.meta !== "undefined" && !import.meta.env?.DEV) {
		return;
	}
	console.error(PREFIX, step, {
		...data,
		error:
			error instanceof Error
				? { name: error.name, message: error.message, stack: error.stack }
				: error,
	});
}
