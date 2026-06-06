import type {
	SettlementRecipientSource,
	SettlementReleaseType,
} from "@filosign/shared";
import type { Address } from "viem";

export type { SettlementRecipientSource };

export type SettlementAttachmentDraft = {
	id: string;
	recipientClientRowId: string;
	recipientEmail: string;
	recipientSource: SettlementRecipientSource;
	recipientLabel: string;
	/** Set at send after profile lookup; optional while composing. */
	recipientWallet?: Address;
	/** Human USDC amount e.g. "10" or "10.50". */
	amountUsdc: string;
	releaseType: SettlementReleaseType;
	/** When releaseType is specific_signer - normalized email. */
	specificSignerEmail?: string;
	thresholdN?: number;
	/** Unix seconds for on-chain expiresAt; unset = no expiry. */
	expiresAtUnix?: number;
};
