import { FilosignAnalyticsProvider } from "@filosign/react/analytics";
import { IconContext } from "@phosphor-icons/react";
import { RouterProvider } from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";
import { type ReactNode, StrictMode } from "react";
import env from "@/src/env";
import { ErrorBoundary } from "@/src/lib/components/app/errors/error-boundary";
import { HydrationLifecycleTracer } from "@/src/lib/components/app/hydration-lifecycle-tracer";
import { Toaster } from "@/src/lib/components/ui/sonner";
import { FilosignProvider } from "@/src/lib/filosign/filosign-provider";
import { QueryClientProvider } from "@/src/lib/filosign/query-client";
import { ThirdwebRootProvider } from "@/src/lib/web3/providers/thirdweb-provider";
import { WagmiProvider } from "@/src/lib/web3/providers/wagmi-provider";
import router from "@/src/router";

export function AppProviders({ children }: { children?: ReactNode }) {
	return (
		<StrictMode>
			<ErrorBoundary>
				<ThemeProvider
					attribute="class"
					defaultTheme="light"
					enableSystem
					storageKey="theme"
				>
					<QueryClientProvider>
						<FilosignAnalyticsProvider
							apiKey={env.VITE_POSTHOG_KEY ?? ""}
							apiHost={env.VITE_POSTHOG_HOST ?? "https://us.i.posthog.com"}
							enabled={env.VITE_POSTHOG_ENABLED === true}
						>
							<ThirdwebRootProvider>
								<WagmiProvider>
									<FilosignProvider>
										<IconContext.Provider
											value={{
												mirrored: false,
												weight: "regular",
											}}
										>
											<HydrationLifecycleTracer />
											{children ?? (
												<>
													<RouterProvider router={router} />
													<Toaster position="bottom-right" />
												</>
											)}
										</IconContext.Provider>
									</FilosignProvider>
								</WagmiProvider>
							</ThirdwebRootProvider>
						</FilosignAnalyticsProvider>
					</QueryClientProvider>
				</ThemeProvider>
			</ErrorBoundary>
		</StrictMode>
	);
}
