import { MotionConfig, SPRING_TOKENS } from "@filosign/motion";
import { FilosignAnalyticsProvider } from "@filosign/react/analytics";
import { IconContext } from "@phosphor-icons/react";
import { RouterProvider } from "@tanstack/react-router";
import { type ReactNode, StrictMode } from "react";
import { Toaster } from "sonner";
import env from "@/src/env";
import { ErrorBoundary } from "@/src/lib/components/app/errors/error-boundary";
import { HydrationLifecycleTracer } from "@/src/lib/components/app/hydration-lifecycle-tracer";
import { ThemeProvider } from "@/src/lib/components/ui/theme-provider";
import { clientAnalyticsConsentRequired } from "@/src/lib/deployment";
import { FilosignProvider } from "@/src/lib/filosign/filosign-provider";
import { QueryClientProvider } from "@/src/lib/filosign/query-client";
import {
	AnalyticsConsentProvider,
	useAnalyticsConsent,
} from "@/src/lib/privacy-consent/consent-context";
import { PrivacyConsentCoordinator } from "@/src/lib/privacy-consent/consent-coordinator";
import { Web3Provider } from "@/src/lib/web3/providers";
import router from "@/src/router";

function AppAnalyticsShell({ children }: { children?: ReactNode }) {
	const consentRequired = clientAnalyticsConsentRequired();
	const { analyticsAllowed } = useAnalyticsConsent();
	const posthogEnabled = env.VITE_POSTHOG_ENABLED === true;
	const analyticsEnabled =
		posthogEnabled && (consentRequired ? analyticsAllowed : true);
	const sessionReplay =
		analyticsEnabled && env.VITE_POSTHOG_SESSION_REPLAY === true;

	return (
		<FilosignAnalyticsProvider
			apiKey={env.VITE_POSTHOG_KEY ?? ""}
			apiHost={env.VITE_POSTHOG_HOST}
			enabled={analyticsEnabled}
			sessionReplay={sessionReplay}
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
						<PrivacyConsentCoordinator
							consentRequired={consentRequired}
							posthogEnabled={posthogEnabled}
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
	);
}

export function AppProviders({ children }: { children?: ReactNode }) {
	return (
		<StrictMode>
			<ErrorBoundary>
				<ThemeProvider defaultTheme="system" storageKey="theme">
					<Toaster position="bottom-right" theme="system" />
					<QueryClientProvider>
						<AnalyticsConsentProvider>
							<AppAnalyticsShell>{children}</AppAnalyticsShell>
						</AnalyticsConsentProvider>
					</QueryClientProvider>
				</ThemeProvider>
			</ErrorBoundary>
		</StrictMode>
	);
}
