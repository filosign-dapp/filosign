const RETRYABLE_HINTS = [
	"rate limit",
	"429",
	"timeout",
	"timed out",
	"econnreset",
	"enotfound",
	"network",
	"fetch failed",
	"502",
	"503",
	"504",
	"bad gateway",
	"service unavailable",
	"gateway timeout",
	"internal server error",
] as const;

export type ResendFailureLike = {
	statusCode?: number | null;
	message?: string;
	name?: string;
};

/** Classify Resend/API failures eligible for SES fallback (not validation 4xx). */
export function isRetryableResendFailure(error: unknown): boolean {
	if (!error || typeof error !== "object") return false;
	const e = error as ResendFailureLike;
	if (typeof e.statusCode === "number") {
		if (e.statusCode === 429) return true;
		if (e.statusCode >= 500) return true;
		if (e.statusCode >= 400 && e.statusCode < 500) return false;
	}
	const text = [e.name, e.message]
		.filter((v): v is string => typeof v === "string")
		.join(" ")
		.toLowerCase();
	return RETRYABLE_HINTS.some((hint) => text.includes(hint));
}

export function toResendFailureError(error: {
	message: string;
	statusCode?: number | null;
	name?: string;
}): Error {
	const err = new Error(error.message);
	if (typeof error.statusCode === "number") {
		Object.assign(err, { statusCode: error.statusCode });
	}
	return err;
}
