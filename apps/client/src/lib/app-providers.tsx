import { MotionConfig, SPRING_TOKENS } from "@filosign/motion";
import { FilosignAnalyticsProvider } from "@filosign/react/analytics";
import { IconContext } from "@phosphor-icons/react";
import { RouterProvider } from "@tanstack/react-router";
import { type ReactNode, StrictMode } from "react";
import env from "@/src/env";
import {
	AnalyticsConsentBanner,
	useAnalyticsConsent,
} from "@/src/lib/analytics/analytics-consent";
import { ErrorBoundary } from "@/src/lib/components/app/errors/error-boundary";
import { HydrationLifecycleTracer } from "@/src/lib/components/app/hydration-lifecycle-tracer";
import { ThemeProvider } from "@/src/lib/components/ui/theme-provider";
import { FilosignProvider } from "@/src/lib/filosign/filosign-provider";
import { QueryClientProvider } from "@/src/lib/filosign/query-client";
import { Web3Provider } from "@/src/lib/web3/providers";
import router from "@/src/router";

export function AppProviders({ children }: { children?: ReactNode }) {
	const { analyticsAllowed, needsConsent, acceptAnalytics, declineAnalytics } =
		useAnalyticsConsent();

	return (
		<StrictMode>
			<ErrorBoundary>
				<ThemeProvider defaultTheme="light" storageKey="theme">
					<QueryClientProvider>
						<FilosignAnalyticsProvider
							apiKey={env.VITE_POSTHOG_KEY ?? ""}
							apiHost={env.VITE_POSTHOG_HOST ?? "https://us.i.posthog.com"}
							enabled={env.VITE_POSTHOG_ENABLED === true && analyticsAllowed}
						>
							<Web3Provider>
								<FilosignProvider>
									<IconContext.Provider
										value={{
											mirrored: false,
											weight: "regular",
										}}
									>
										<HydrationLifecycleTracer />
										<AnalyticsConsentBanner
											needsConsent={
												env.VITE_POSTHOG_ENABLED === true && needsConsent
											}
											onAccept={acceptAnalytics}
											onDecline={declineAnalytics}
										/>
										<MotionConfig
											reducedMotion="user"
											transition={SPRING_TOKENS.smooth}
										>
											{children ?? <RouterProvider router={router} />}
										</MotionConfig>
									</IconContext.Provider>
								</FilosignProvider>
							</Web3Provider>
						</FilosignAnalyticsProvider>
					</QueryClientProvider>
				</ThemeProvider>
			</ErrorBoundary>
		</StrictMode>
	);
}
