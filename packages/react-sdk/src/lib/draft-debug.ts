const SAVE_PREFIX = "[draft-save]";
const LOAD_PREFIX = "[draft-load]";

function isDev(): boolean {
	return typeof import.meta !== "undefined" && Boolean(import.meta.env?.DEV);
}

export function debugDraftSave(
	step: string,
	data?: Record<string, unknown>,
): void {
	if (!isDev()) return;
	if (data !== undefined) {
		console.info(SAVE_PREFIX, step, data);
	} else {
		console.info(SAVE_PREFIX, step);
	}
}

export function debugDraftSaveError(
	step: string,
	error: unknown,
	data?: Record<string, unknown>,
): void {
	if (!isDev()) return;
	console.error(SAVE_PREFIX, step, {
		...data,
		error:
			error instanceof Error
				? { name: error.name, message: error.message, stack: error.stack }
				: error,
	});
}

export function debugDraftLoad(
	step: string,
	data?: Record<string, unknown>,
): void {
	if (!isDev()) return;
	if (data !== undefined) {
		console.info(LOAD_PREFIX, step, data);
	} else {
		console.info(LOAD_PREFIX, step);
	}
}
