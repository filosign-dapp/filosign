import { suppressGlobalErrorToast } from "./mutation-meta";
import { presentAppError, showAppErrorToast } from "./present-app-error";

export function localMutationErrorOptions<T extends Record<string, unknown>>(
	overrides: T = {} as T,
): T & { meta: { suppressErrorToast: true } } {
	const { onError, ...rest } = overrides;
	return suppressGlobalErrorToast({
		...rest,
		onError: (err: unknown, ...args: unknown[]) => {
			showAppErrorToast(err);
			if (typeof onError === "function") {
				(onError as (e: unknown, ...a: unknown[]) => void)(err, ...args);
			}
		},
	}) as T & { meta: { suppressErrorToast: true } };
}

export function formatInlineAppError(error: unknown): string {
	const presented = presentAppError(error);
	if (presented.description) {
		return `${presented.title} — ${presented.description}`;
	}
	return presented.title;
}
