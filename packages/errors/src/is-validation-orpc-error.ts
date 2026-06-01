import { isOrpcErrorLike, readOrpcData } from "./is-orpc-error";

/** Input/schema validation — forms should show inline; skip global mutation toast. */
export function isValidationOrpcError(error: unknown): boolean {
	if (!isOrpcErrorLike(error)) return false;
	if (error.code !== "BAD_REQUEST") return false;

	const data = readOrpcData(error);
	if (data) {
		if ("issues" in data || "fieldErrors" in data || "formErrors" in data) {
			return true;
		}
	}

	const message = error.message.trim();
	if (message === "Invalid request") return true;
	const lower = message.toLowerCase();
	if (lower.includes("invalid input")) return true;

	return false;
}
