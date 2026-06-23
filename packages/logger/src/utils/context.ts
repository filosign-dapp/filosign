/** Narrow optional logger context fields at formatting boundaries. */
export function readCtxString(
	context: Record<string, unknown> | undefined,
	key: string,
): string | undefined {
	const value = context?.[key];
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function readCtxNumber(
	context: Record<string, unknown> | undefined,
	key: string,
): number | undefined {
	const value = context?.[key];
	return typeof value === "number" && Number.isFinite(value)
		? value
		: undefined;
}

export function readCtxBoolean(
	context: Record<string, unknown> | undefined,
	key: string,
): boolean | undefined {
	const value = context?.[key];
	return typeof value === "boolean" ? value : undefined;
}
