import env from "@/env";
import { isDodoLiveMode } from "./policy";

export const ARCHIVAL_PRODUCT_IDS = [
	"archival_year",
	"archival_bundle_3y",
] as const;

export type ArchivalProductId = (typeof ARCHIVAL_PRODUCT_IDS)[number];

export function isArchivalProductId(value: string): value is ArchivalProductId {
	return (ARCHIVAL_PRODUCT_IDS as readonly string[]).includes(value);
}

const ARCHIVAL_TERM_YEARS: Record<ArchivalProductId, number> = {
	archival_year: 1,
	archival_bundle_3y: 3,
};

export function archivalTermYears(productId: ArchivalProductId): number {
	return ARCHIVAL_TERM_YEARS[productId];
}

export function isArchivalSubscriptionProduct(
	_productId: ArchivalProductId,
): boolean {
	return true;
}

/** List USD prices (org-flat). Dodo dashboard should match. */
export const ARCHIVAL_LIST_PRICES_USD: Record<
	ArchivalProductId,
	{
		amountUsd: number;
		label: string;
		billingModel: "subscription" | "one_time";
	}
> = {
	archival_year: {
		amountUsd: 49,
		label: "Yearly Filecoin retention (auto-renew)",
		billingModel: "subscription",
	},
	archival_bundle_3y: {
		amountUsd: 99,
		label: "3-year Filecoin retention (auto-renew)",
		billingModel: "subscription",
	},
};

const DODO_TEST_ARCHIVAL_PRODUCT_IDS: Record<ArchivalProductId, string> = {
	archival_year: "pdt_0NgMNUvCPUVHCwwTyW2m9",
	archival_bundle_3y: "pdt_0NgMNh7e1JVDEcvpio6YA",
};

const DODO_LIVE_ARCHIVAL_PRODUCT_IDS: Record<ArchivalProductId, string> = {
	archival_year: "pdt_0NhfzjA2HBxXSAniOOz4c",
	archival_bundle_3y: "pdt_0NhfzqhROk5bLAJAc6JyZ",
};

const DODO_PRODUCT_ID_TO_ARCHIVAL: Record<string, ArchivalProductId> = {};

function registerArchivalProductMappings() {
	for (const productId of ARCHIVAL_PRODUCT_IDS) {
		const envKey = {
			archival_year: env.DODO_PRODUCT_ID_ARCHIVAL_YEAR,
			archival_bundle_3y: env.DODO_PRODUCT_ID_ARCHIVAL_BUNDLE_3Y,
		}[productId];
		if (envKey) {
			DODO_PRODUCT_ID_TO_ARCHIVAL[envKey] = productId;
		}
		DODO_PRODUCT_ID_TO_ARCHIVAL[DODO_LIVE_ARCHIVAL_PRODUCT_IDS[productId]] =
			productId;
		DODO_PRODUCT_ID_TO_ARCHIVAL[DODO_TEST_ARCHIVAL_PRODUCT_IDS[productId]] =
			productId;
	}
}

registerArchivalProductMappings();

export function resolveDodoProductIdForArchival(
	productId: ArchivalProductId,
): string {
	const fromEnv = {
		archival_year: env.DODO_PRODUCT_ID_ARCHIVAL_YEAR,
		archival_bundle_3y: env.DODO_PRODUCT_ID_ARCHIVAL_BUNDLE_3Y,
	}[productId];
	if (fromEnv) return fromEnv;
	return isDodoLiveMode()
		? DODO_LIVE_ARCHIVAL_PRODUCT_IDS[productId]
		: DODO_TEST_ARCHIVAL_PRODUCT_IDS[productId];
}

export function resolveArchivalProductIdFromDodoProduct(
	dodoProductId: string | undefined,
): ArchivalProductId | null {
	if (!dodoProductId) return null;
	return DODO_PRODUCT_ID_TO_ARCHIVAL[dodoProductId] ?? null;
}

export function listArchivalCatalogProducts() {
	return ARCHIVAL_PRODUCT_IDS.map((id) => ({
		productId: id,
		termYears: ARCHIVAL_TERM_YEARS[id],
		...ARCHIVAL_LIST_PRICES_USD[id],
	}));
}
