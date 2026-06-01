export function suppressGlobalErrorToast<T extends Record<string, unknown>>(
	options: T = {} as T,
): T & { meta: { suppressErrorToast: true } } {
	return {
		...options,
		meta: { suppressErrorToast: true },
	} as T & { meta: { suppressErrorToast: true } };
}
