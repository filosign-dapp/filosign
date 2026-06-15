import { TEMPLATE_LIMITS } from "@filosign/shared";

export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export const KB = 1024;
export const MB = 1024 * KB;

/** Matches FSPaymentValidator `MAX_PAYOUT_LEGS` on-chain. */
export const MAX_SETTLEMENT_LEGS_PRODUCT = 32;

export const MAX_FILE_SIZE = TEMPLATE_LIMITS.MAX_FILE_SIZE;

/** Max documents per organization template (client decrypts all on edit). */
export const MAX_TEMPLATE_DOCUMENTS = TEMPLATE_LIMITS.MAX_TEMPLATE_DOCUMENTS;

/** Max total plaintext bytes across all template documents. */
export const MAX_TEMPLATE_TOTAL_BYTES =
	TEMPLATE_LIMITS.MAX_TEMPLATE_TOTAL_BYTES;

export const DOMAIN = "https://filosign.xyz";
export const URI = "https://filosign.xyz";
