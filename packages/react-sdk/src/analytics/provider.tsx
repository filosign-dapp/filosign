import { PostHogProvider } from "@posthog/react";
import type { ReactNode } from "react";
import { analyticsBeforeSend } from "./before-send";
import {
	AnalyticsContextProvider,
	useNoopAnalytics,
	usePostHogAnalyticsBridge,
} from "./context";

export type FilosignAnalyticsProviderProps = {
	children: ReactNode;
	apiKey: string;
	apiHost: string;
	enabled: boolean;
	/** When true (and `enabled`), allows session replay for error correlation. */
	sessionReplay?: boolean;
};

function PostHogAnalyticsBridge({ children }: { children: ReactNode }) {
	const analytics = usePostHogAnalyticsBridge();
	return (
		<AnalyticsContextProvider value={analytics}>
			{children}
		</AnalyticsContextProvider>
	);
}

/** Mount in the app shell (e.g. `apps/client` `main.tsx`). Requires `@posthog/react` + `posthog-js`. */
export function FilosignAnalyticsProvider({
	children,
	apiKey,
	apiHost,
	enabled,
	sessionReplay = false,
}: FilosignAnalyticsProviderProps) {
	const noop = useNoopAnalytics();

	if (!enabled || !apiKey) {
		return (
			<AnalyticsContextProvider value={noop}>
				{children}
			</AnalyticsContextProvider>
		);
	}

	return (
		<PostHogProvider
			apiKey={apiKey}
			options={{
				api_host: apiHost,
				autocapture: false,
				// Error tracking: separate from click autocapture (PostHog `capture_exceptions`).
				capture_exceptions: true,
				capture_pageview: false,
				capture_pageleave: false,
				disable_session_recording: !sessionReplay,
				persistence: "localStorage",
				before_send: analyticsBeforeSend,
			}}
		>
			<PostHogAnalyticsBridge>{children}</PostHogAnalyticsBridge>
		</PostHogProvider>
	);
}
