export type OrpcErrorLike = {
	code: string;
	message: string;
	data?: unknown;
};

export function isOrpcErrorLike(error: unknown): error is OrpcErrorLike {
	if (!error || typeof error !== "object") return false;
	const record = error as Record<string, unknown>;
	return typeof record.code === "string" && typeof record.message === "string";
}

export function readOrpcData(
	error: OrpcErrorLike,
): Record<string, unknown> | null {
	const { data } = error;
	if (!data || typeof data !== "object") return null;
	return data as Record<string, unknown>;
}

export function readAppCodeFromOrpc(error: OrpcErrorLike): string | null {
	const data = readOrpcData(error);
	if (!data) return null;
	const appCode = data.appCode;
	return typeof appCode === "string" ? appCode : null;
}

export function readEntitlementCodeFromOrpc(
	error: OrpcErrorLike,
): string | null {
	const data = readOrpcData(error);
	if (!data) return null;
	const code = data.code;
	return typeof code === "string" ? code : null;
}

export function readParamsFromOrpc(
	error: OrpcErrorLike,
): Record<string, string | number | boolean> | undefined {
	const data = readOrpcData(error);
	if (!data) return undefined;
	const params = data.params;
	if (!params || typeof params !== "object") {
		const used = data.used;
		const limit = data.limit;
		if (typeof used === "number" && typeof limit === "number") {
			return { used, limit };
		}
		return undefined;
	}
	const out: Record<string, string | number | boolean> = {};
	for (const [key, value] of Object.entries(params)) {
		if (
			typeof value === "string" ||
			typeof value === "number" ||
			typeof value === "boolean"
		) {
			out[key] = value;
		}
	}
	return Object.keys(out).length > 0 ? out : undefined;
}
