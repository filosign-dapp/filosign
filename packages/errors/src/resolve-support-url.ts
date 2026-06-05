import { getErrorDefinition, isAppErrorCode } from "./get-error-definition";

export function resolveSupportUrl(
	code: string,
	helpBaseUrl: string,
): string | null {
	if (!isAppErrorCode(code)) return null;
	const def = getErrorDefinition(code);
	if (!def || def.audience !== "user" || !def.supportSlug) return null;
	if (def.showSupportLink === false) return null;
	const base = helpBaseUrl.replace(/\/$/, "");
	return `${base}#${def.supportSlug}`;
}
