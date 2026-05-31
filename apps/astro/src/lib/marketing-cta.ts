import { env } from "../env";

export const MARKETING_CTA = {
	getStartedHref: "/pricing",
	getStartedLabel: "Get started",
	tryFilosignLabel: "Try Filosign",
	sandboxUrl: env.PUBLIC_SANDBOX_CLIENT_URL.replace(/\/$/, ""),
} as const;
