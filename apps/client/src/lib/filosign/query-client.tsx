import {
	QueryClient,
	QueryClientProvider as QueryClientProviderBase,
} from "@tanstack/react-query";
import { toast } from "sonner";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 60_000,
			retry: 1,
			refetchOnWindowFocus: false,
		},
		mutations: {
			retry: 0,
			onError: (error) => {
				const message =
					error instanceof Error ? error.message : "Request failed";
				toast.error(message);
			},
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
