const PREFIX = "[draft-load]";

export function debugDraftLoad(
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
