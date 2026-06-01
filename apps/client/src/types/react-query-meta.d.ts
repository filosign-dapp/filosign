/** `mutationMeta.suppressErrorToast` skips the global MutationCache error toast. */
import "@tanstack/query-core";
import "@tanstack/react-query";

declare module "@tanstack/query-core" {
	interface Register {
		mutationMeta: {
			suppressErrorToast?: boolean;
		};
	}
}

declare module "@tanstack/react-query" {
	interface Register {
		mutationMeta: {
			suppressErrorToast?: boolean;
		};
	}

	interface MutateOptions<
		TData = unknown,
		TError = unknown,
		TVariables = unknown,
		TContext = unknown,
	> {
		meta?: {
			suppressErrorToast?: boolean;
		};
	}
}
