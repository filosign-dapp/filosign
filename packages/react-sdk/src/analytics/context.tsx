import { scrubAnalyticsProperties } from "@filosign/shared";
import { usePostHog } from "@posthog/react";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
} from "react";
import { registerClientExceptionCapture } from "./client-exception";
import { PIECE_CID_PROPERTY, POSTHOG_ENVELOPE_GROUP } from "./envelope";
import type { CLIENT_ANALYTICS_EVENTS } from "./events";
import type { AnalyticsExceptionProperties } from "./types";

type CaptureFn = (
	event: (typeof CLIENT_ANALYTICS_EVENTS)[keyof typeof CLIENT_ANALYTICS_EVENTS],
	properties?: Record<string, unknown>,
) => void;

type IdentifyFn = (wallet: string | undefined) => void;

type CaptureExceptionFn = (
	error: unknown,
	properties?: AnalyticsExceptionProperties,
) => void;

export type AnalyticsContextValue = {
	capture: CaptureFn;
	identify: IdentifyFn;
	captureException: CaptureExceptionFn;
};

const noopCapture: CaptureFn = () => {};
const noopIdentify: IdentifyFn = () => {};
const noopCaptureException: CaptureExceptionFn = () => {};

const AnalyticsContext = createContext<AnalyticsContextValue>({
	capture: noopCapture,
	identify: noopIdentify,
	captureException: noopCaptureException,
});

export function AnalyticsContextProvider({
	value,
	children,
}: {
	value: AnalyticsContextValue;
	children: ReactNode;
}) {
	return (
		<AnalyticsContext.Provider value={value}>
			{children}
		</AnalyticsContext.Provider>
	);
}

function useAnalyticsContext(): AnalyticsContextValue {
	return useContext(AnalyticsContext);
}

export function useNoopAnalytics(): AnalyticsContextValue {
	return useMemo(
		() => ({
			capture: noopCapture,
			identify: noopIdentify,
			captureException: noopCaptureException,
		}),
		[],
	);
}

/** Bridges `@posthog/react` client into Filosign analytics context (inside `PostHogProvider` only). */
export function usePostHogAnalyticsBridge(): AnalyticsContextValue {
	const posthog = usePostHog();

	const capture = useCallback<CaptureFn>(
		(event, properties) => {
			try {
				const pieceCid = properties?.[PIECE_CID_PROPERTY];
				if (typeof pieceCid === "string" && pieceCid.trim()) {
					posthog.group(POSTHOG_ENVELOPE_GROUP, pieceCid.trim());
				}
				posthog.capture(event, properties);
			} catch {
				// PostHog blocked or unavailable.
			}
		},
		[posthog],
	);

	const identify = useCallback<IdentifyFn>(
		(wallet) => {
			if (!wallet) return;
			try {
				posthog.identify(wallet.toLowerCase());
			} catch {
				// noop
			}
		},
		[posthog],
	);

	const captureException = useCallback<CaptureExceptionFn>(
		(error, properties) => {
			try {
				const scrubbed = properties
					? scrubAnalyticsProperties(properties)
					: undefined;
				posthog.captureException(error, scrubbed);
			} catch {
				// noop
			}
		},
		[posthog],
	);

	useEffect(() => {
		registerClientExceptionCapture(captureException);
		return () => registerClientExceptionCapture(null);
	}, [captureException]);

	return useMemo(
		() => ({ capture, identify, captureException }),
		[capture, identify, captureException],
	);
}

export type CaptureAppEvent = CaptureFn;

export function useCaptureAppEvent(): CaptureFn {
	return useAnalyticsContext().capture;
}

export function useIdentifyAnalyticsWallet(): IdentifyFn {
	return useAnalyticsContext().identify;
}

export function useCaptureClientException(): CaptureExceptionFn {
	return useAnalyticsContext().captureException;
}
