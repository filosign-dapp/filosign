import type {
	SettlementRecipientSource,
	SettlementReleaseType,
} from "@filosign/shared";
import type { Address } from "viem";

export type { SettlementRecipientSource };

export type SettlementAttachmentDraft = {
	id: string;
	ruleId?: string;
	recipientClientRowId?: string;
	recipientEmail?: string;
	recipientSource: SettlementRecipientSource;
	recipientLabel: string;
	recipientWallet?: Address;
	amountUsdc: string;
	releaseType: SettlementReleaseType;
	specificSignerEmail?: string;
	thresholdN?: number;
	expiresAtUnix?: number;
};
