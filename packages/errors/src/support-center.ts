import { type AppErrorCode, ERROR_CATALOG } from "./catalog/index";
import type { ErrorDefinition } from "./types";

export const SUPPORT_CATEGORIES = [
	"Signing",
	"Billing & plans",
	"Wallet & keys",
	"Account",
	"General",
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export type SupportCenterEntry = {
	code: AppErrorCode;
	supportSlug: string;
	title: string;
	description: string;
	steps: readonly string[];
	category: SupportCategory;
};

export function supportCategoryForCode(code: string): SupportCategory {
	if (code.startsWith("SIGNING.")) return "Signing";
	if (code.startsWith("ENTITLEMENT.")) return "Billing & plans";
	if (code.startsWith("CLIENT.CRYPTO.")) return "Wallet & keys";
	if (code.startsWith("AUTH.")) return "Account";
	return "General";
}

function isSupportCenterEntry(def: ErrorDefinition): def is ErrorDefinition & {
	supportSlug: string;
} {
	return (
		def.audience === "user" &&
		typeof def.supportSlug === "string" &&
		def.supportSlug.length > 0 &&
		def.showSupportLink !== false
	);
}

export function listSupportCenterEntries(): SupportCenterEntry[] {
	const rows: SupportCenterEntry[] = [];
	for (const code of Object.keys(ERROR_CATALOG) as AppErrorCode[]) {
		const def = ERROR_CATALOG[code] as ErrorDefinition;
		if (!isSupportCenterEntry(def)) continue;
		rows.push({
			code,
			supportSlug: def.supportSlug,
			title: def.title,
			description: def.description,
			steps: def.steps,
			category: supportCategoryForCode(code),
		});
	}
	return rows.sort((a, b) => a.title.localeCompare(b.title));
}
