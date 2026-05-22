import type {
	PaymentRecipientSource,
	PaymentReleaseType,
} from "@filosign/shared";
import type { Address } from "viem";

export type { PaymentRecipientSource };

export type PaymentAttachmentDraft = {
	id: string;
	recipientClientRowId: string;
	recipientEmail: string;
	recipientSource: PaymentRecipientSource;
	recipientLabel: string;
	/** Set at send after profile lookup; optional while composing. */
	recipientWallet?: Address;
	/** Human USDC amount e.g. "10" or "10.50". */
	amountUsdc: string;
	releaseType: PaymentReleaseType;
	/** When releaseType is specific_signer — normalized email. */
	specificSignerEmail?: string;
	thresholdN?: number;
};
