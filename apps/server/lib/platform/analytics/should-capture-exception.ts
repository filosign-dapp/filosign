import { isOrpcErrorLike, readAppCodeFromOrpc } from "@filosign/errors";

const SKIP_ORPC_CODES = new Set([
	"UNAUTHORIZED",
	"FORBIDDEN",
	"BAD_REQUEST",
	"NOT_FOUND",
	"CONFLICT",
	"PAYLOAD_TOO_LARGE",
	"PRECONDITION_FAILED",
	"METHOD_NOT_SUPPORTED",
	"UNPROCESSABLE_CONTENT",
	"TIMEOUT",
]);

/** Whether an error should be sent to PostHog Issues (not user toasts / expected API errors). */
export function shouldCaptureServerException(error: unknown): boolean {
	if (isOrpcErrorLike(error)) {
		if (readAppCodeFromOrpc(error)) return false;
		if (SKIP_ORPC_CODES.has(error.code)) return false;
		if (error.code === "INTERNAL_SERVER_ERROR") return true;
		return false;
	}
	return error instanceof Error;
}
