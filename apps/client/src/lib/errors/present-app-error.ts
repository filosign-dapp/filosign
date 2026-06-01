import {
	type PresentErrorOptions,
	type PresentedError,
	presentError,
} from "@filosign/errors";
import { showErrorToast } from "@filosign/errors/client";
import env from "@/src/env";

export function presentAppError(
	error: unknown,
	options?: Omit<PresentErrorOptions, "helpBaseUrl">,
): PresentedError {
	return presentError(error, {
		...options,
		helpBaseUrl: env.VITE_ASTRO_URL.replace(/\/$/, ""),
		devMode: import.meta.env.DEV,
	});
}

export function showAppErrorToast(error: unknown): void {
	const presented = presentAppError(error);
	showErrorToast(presented, { devMode: import.meta.env.DEV });
}
