import { scrubCaptureEvent } from "@filosign/shared";
import type { BeforeSendFn } from "posthog-js";

/** PostHog `before_send` - redact PII before events leave the browser. */
export const analyticsBeforeSend: BeforeSendFn = (event) =>
	scrubCaptureEvent(event);
