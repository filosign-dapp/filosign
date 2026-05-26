import {
	QueryClient,
	QueryClientProvider as QueryClientProviderBase,
} from "@tanstack/react-query";

const queryClient = new QueryClient({
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
