export function parseBooleanEnv(value: string | undefined): boolean {
	return value?.toLowerCase() === "true";
}

export function isEnabledByBooleanEnv(value: string | undefined): boolean {
	return parseBooleanEnv(value);
}
