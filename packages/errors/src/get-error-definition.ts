import { type AppErrorCode, ERROR_CATALOG } from "./catalog/index";
import type { ErrorDefinition } from "./types";

export function getErrorDefinition(code: string): ErrorDefinition | undefined {
	if (!(code in ERROR_CATALOG)) return undefined;
	return ERROR_CATALOG[code as AppErrorCode] as ErrorDefinition;
}

export function isAppErrorCode(code: string): code is AppErrorCode {
	return code in ERROR_CATALOG;
}

export function listUserDocumentedErrors(): Array<{
	code: AppErrorCode;
	supportSlug: string;
}> {
	const rows: Array<{ code: AppErrorCode; supportSlug: string }> = [];
	for (const code of Object.keys(ERROR_CATALOG) as AppErrorCode[]) {
		const def = ERROR_CATALOG[code] as ErrorDefinition;
		if (def.audience !== "user" || !def.supportSlug) continue;
		rows.push({ code, supportSlug: def.supportSlug });
	}
	return rows;
}
