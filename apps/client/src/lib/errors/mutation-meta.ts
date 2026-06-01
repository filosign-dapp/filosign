export function suppressGlobalErrorToast(
	options: Record<string, unknown> = {},
): Record<string, unknown> {
	return {
		...options,
		meta: { suppressErrorToast: true },
	};
}
