/** Versioned settlement feature legal copy — counsel must review before production. */
export const SETTLEMENT_FEATURE_TERMS_VERSION = "2026-05-01" as const;

/** Checkbox label on sign page when a payout attachment is present. */
export const SETTLEMENT_RECIPIENT_ACK_LABEL =
	"I understand any attached USDC payout is between the sender and me. Filosign does not guarantee payment, is not a party to that transfer, and does not resolve payment disputes between us.";

export const SETTLEMENT_RECIPIENT_ACK_INTENT_VERSION =
	`settlement-recipient-ack:${SETTLEMENT_FEATURE_TERMS_VERSION}` as const;
