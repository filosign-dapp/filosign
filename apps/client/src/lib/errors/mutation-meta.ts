export function suppressGlobalErrorToast<T extends Record<string, unknown>>(
	options: T = {} as T,
): T & { meta: { suppressErrorToast: true } } {
	const result = {
		...options,
		meta: { suppressErrorToast: true as const },
	};
	return result as T & { meta: { suppressErrorToast: true } };
}
