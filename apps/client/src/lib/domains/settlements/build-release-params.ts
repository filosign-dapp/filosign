import type { SettlementRuleDraft } from "@filosign/react/files";
import {
	hashNormalizedSignerEmail,
	normalizePlacementRecipientEmail,
	type SettlementReleaseType,
} from "@filosign/shared";
import type { Hex } from "viem";
import type { Recipient } from "@/src/lib/domains/files/envelope-form-types";
import type { SettlementAttachmentDraft } from "@/src/routes/dashboard/envelope/create/-lib/types/settlement-attachment";
import { isValidRecipientEmail } from "@/src/routes/dashboard/envelope/create/-lib/utils/recipient-email";

function signerCommitmentsFromRecipients(recipients: Recipient[]): Hex[] {
	return recipients
		.filter((r) => r.role === "signer")
		.map((r) => r.email?.trim())
		.filter((email): email is string =>
			Boolean(email && isValidRecipientEmail(email)),
		)
		.map((email) =>
			hashNormalizedSignerEmail(normalizePlacementRecipientEmail(email)),
		);
}

export function buildReleaseParamsFromDraft(
	draft: SettlementAttachmentDraft,
	recipients: Recipient[],
): SettlementRuleDraft["releaseParams"] {
	const releaseType = draft.releaseType satisfies SettlementReleaseType;
	const signerCommitments = signerCommitmentsFromRecipients(recipients);

	switch (releaseType) {
		case "all_signed":
			return { releaseType: "all_signed" };
		case "all_required_signed":
			return { releaseType: "all_required_signed" };
		case "all_signed_complete":
			return { releaseType: "all_signed_complete" };
		case "specific_signer": {
			const email = draft.specificSignerEmail?.trim();
			if (!email) {
				throw new Error("Specific signer email is required");
			}
			return {
				releaseType: "specific_signer",
				signerEmailCommitment: hashNormalizedSignerEmail(
					normalizePlacementRecipientEmail(email),
				),
			};
		}
		case "at_least_n": {
			const thresholdN = draft.thresholdN ?? 1;
			return {
				releaseType: "at_least_n",
				thresholdN,
				signerEmailCommitments: signerCommitments,
			};
		}
		case "quorum_required": {
			const thresholdN = draft.thresholdN ?? 1;
			return { releaseType: "quorum_required", thresholdN };
		}
		case "quorum_set": {
			const thresholdN = draft.thresholdN ?? 1;
			return {
				releaseType: "quorum_set",
				thresholdN,
				signerEmailCommitments: signerCommitments,
			};
		}
		case "quorum_all": {
			const thresholdN = draft.thresholdN ?? 1;
			return { releaseType: "quorum_all", thresholdN };
		}
		case "all_of_set":
			return {
				releaseType: "all_of_set",
				signerEmailCommitments: signerCommitments,
			};
		default:
			return { releaseType: "all_signed" };
	}
}
