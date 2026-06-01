import { isValidationOrpcError } from "@filosign/errors";
import {
	MutationCache,
	QueryClient,
	QueryClientProvider as QueryClientProviderBase,
} from "@tanstack/react-query";
import { showAppErrorToast } from "@/src/lib/errors/present-app-error";

const queryClient = new QueryClient({
	mutationCache: new MutationCache({
		onError: (error, _variables, _context, mutation) => {
			if (mutation.meta?.suppressErrorToast) return;
			if (isValidationOrpcError(error)) return;
			showAppErrorToast(error);
		},
	}),
	defaultOptions: {
		queries: {
			staleTime: 60_000,
			retry: 1,
			refetchOnWindowFocus: false,
		},
		mutations: {
			retry: 0,
		},
	},
});

export function QueryClientProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<QueryClientProviderBase client={queryClient}>
			{children}
		</QueryClientProviderBase>
	);
}

export { queryClient };
