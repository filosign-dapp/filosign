import {
	DEFAULT_SANDBOX_CLIENT_URL,
	type EvaluatedActivationStep,
} from "@filosign/shared";
import env from "@/src/env";

export type ResolvedActivationStepHref = {
	href: string;
	external: boolean;
};

export function resolveActivationStepHref(
	step: EvaluatedActivationStep,
): ResolvedActivationStepHref | null {
	if (step.href) {
		return {
			href: step.href,
			external: step.href.startsWith("http"),
		};
	}

	const astroBase = env.VITE_ASTRO_URL.replace(/\/$/, "");
	switch (step.linkKey) {
		case "pricing":
			return { href: `${astroBase}/pricing`, external: true };
		case "sandbox":
			return { href: DEFAULT_SANDBOX_CLIENT_URL, external: true };
		default:
			return null;
	}
}

export function resolveActivationHintHref(args: {
	linkKey?: "pricing" | "sandbox" | "support";
	href?: string;
}): string | undefined {
	if (args.href) return args.href;
	const astroBase = env.VITE_ASTRO_URL.replace(/\/$/, "");
	switch (args.linkKey) {
		case "pricing":
			return `${astroBase}/pricing`;
		case "sandbox":
			return DEFAULT_SANDBOX_CLIENT_URL;
		case "support":
			return "/dashboard/support";
		default:
			return undefined;
	}
}
