import { suppressGlobalErrorToast } from "./mutation-meta";
import { presentAppError, showAppErrorToast } from "./present-app-error";

/** TanStack mutate options with global toast suppressed and local catalog toast on failure. */
export function localMutationErrorOptions<T extends Record<string, unknown>>(
	overrides: T = {} as T,
): T & { meta: { suppressErrorToast: true } } {
	const { onError, ...rest } = overrides;
	// Generic T cannot be inferred through wrapped onError; one bridge cast is intentional.
	return suppressGlobalErrorToast({
		...rest,
		onError: (err: unknown, ...args: unknown[]) => {
			showAppErrorToast(err);
			if (typeof onError === "function") {
				(onError as (e: unknown, ...a: unknown[]) => void)(err, ...args);
			}
		},
	}) as unknown as T & { meta: { suppressErrorToast: true } };
}

export function formatInlineAppError(error: unknown): string {
	const presented = presentAppError(error);
	if (presented.description) {
		return `${presented.title} — ${presented.description}`;
	}
	return presented.title;
}
