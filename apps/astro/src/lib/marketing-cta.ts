import { env } from "../env";

export const MARKETING_CTA = {
	getStartedHref: "/pricing",
	getStartedLabel: "Start Free Trial",
	tryFilosignLabel: "Try the sandbox",
	sandboxUrl: env.PUBLIC_SANDBOX_CLIENT_URL.replace(/\/$/, ""),
} as const;
