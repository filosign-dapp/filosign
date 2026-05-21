import type {
	PaymentRecipientSource,
	PaymentReleaseType,
} from "@filosign/shared";
import type { Address } from "viem";

export type { PaymentRecipientSource };

export type PaymentAttachmentDraft = {
	id: string;
	recipientWallet: Address;
	recipientSource: PaymentRecipientSource;
	recipientLabel: string;
	/** Human USDC amount e.g. "10" or "10.50". */
	amountUsdc: string;
	releaseType: PaymentReleaseType;
	/** When releaseType is specific_signer — normalized email. */
	specificSignerEmail?: string;
	thresholdN?: number;
};
